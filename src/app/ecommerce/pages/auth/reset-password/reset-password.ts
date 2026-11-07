import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, form, minLength, required, schema, validate } from '@angular/forms/signals';

import { AuthService } from '../../../../core/auth/auth.service';

interface ResetPasswordModel {
  newPassword: string;
  confirmPassword: string;
}

const resetPasswordSchema = schema<ResetPasswordModel>((path) => {
  required(path.newPassword, { message: 'Creá una contraseña nueva' });
  minLength(path.newPassword, 8, { message: 'Mínimo 8 caracteres' });

  required(path.confirmPassword, { message: 'Repetí la contraseña' });
  validate(path.confirmPassword, (ctx) =>
    ctx.value() === ctx.valueOf(path.newPassword)
      ? undefined
      : { kind: 'mismatch', message: 'Las contraseñas no coinciden' },
  );
});

/**
 * Paso 3 (final) de "olvidé mi contraseña" (`/auth/restablecer-contrasena`). La autorización
 * de un solo uso llega por `history.state` (nunca por query param - ver `verify-code.ts`), así
 * que un refresh de página la pierde a propósito: si falta, se manda de nuevo al inicio del
 * flujo en vez de dejar el formulario inservible en pantalla.
 */
@Component({
  selector: 'app-reset-password',
  imports: [FormField, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export default class ResetPassword {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly resetAuthorization: string | undefined = (
    history.state as { resetAuthorization?: string } | null
  )?.resetAuthorization;

  private readonly model = signal<ResetPasswordModel>({ newPassword: '', confirmPassword: '' });
  protected readonly resetForm = form(this.model, resetPasswordSchema);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly done = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  constructor() {
    if (!this.resetAuthorization) void this.router.navigateByUrl('/auth/olvide-contrasena');
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.resetForm().markAsTouched();
    if (!this.resetForm().valid() || !this.resetAuthorization) return;

    this.submitting.set(true);
    this.error.set(null);
    const result = await this.authService.resetPassword(
      this.resetAuthorization,
      this.model().newPassword,
    );
    this.submitting.set(false);

    if (result.success) {
      this.done.set(true);
    } else {
      this.error.set(result.message ?? 'No pudimos actualizar tu contraseña');
    }
  }
}
