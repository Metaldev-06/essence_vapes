import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, email, form, required, schema } from '@angular/forms/signals';

import { AuthService } from '../../../../core/auth/auth.service';

interface ForgotPasswordModel {
  email: string;
}

const forgotPasswordSchema = schema<ForgotPasswordModel>((path) => {
  required(path.email, { message: 'Ingresá tu email' });
  email(path.email, { message: 'Ingresá un email válido' });
});

/**
 * Paso 1 de "olvidé mi contraseña". El backend siempre responde el mismo mensaje genérico
 * (nunca revela si el email existe) - esta pantalla no distingue éxito de "no existe", solo
 * red/servidor. Al confirmar, pasa a `/auth/verificar-codigo` llevando el email por query param
 * (no es secreto, mismo criterio que `returnUrl` en login/register).
 */
@Component({
  selector: 'app-forgot-password',
  imports: [FormField, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export default class ForgotPassword {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly model = signal<ForgotPasswordModel>({ email: '' });
  protected readonly forgotForm = form(this.model, forgotPasswordSchema);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.forgotForm().markAsTouched();
    if (!this.forgotForm().valid()) return;

    this.submitting.set(true);
    this.error.set(null);
    const result = await this.authService.forgotPassword(this.model().email);
    this.submitting.set(false);

    if (result.success) {
      this.sent.set(true);
    } else {
      this.error.set(result.message ?? 'Ocurrió un error inesperado');
    }
  }

  protected continueToCode(): void {
    void this.router.navigate(['/auth/verificar-codigo'], {
      queryParams: { email: this.model().email, purpose: 'reset' },
    });
  }
}
