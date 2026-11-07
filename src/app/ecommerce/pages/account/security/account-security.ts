import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormField,
  form,
  minLength,
  pattern,
  required,
  schema,
  validate,
} from '@angular/forms/signals';

import type { SecurityStatus } from '../../../../core/auth/auth.model';
import { AuthService } from '../../../../core/auth/auth.service';

interface ChangePasswordModel {
  code: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function emptyChangePasswordModel(): ChangePasswordModel {
  return { code: '', currentPassword: '', newPassword: '', confirmPassword: '' };
}

const changePasswordSchema = schema<ChangePasswordModel>((path) => {
  required(path.code, { message: 'Ingresá el código' });
  pattern(path.code, /^\d{6}$/, { message: 'El código debe tener 6 dígitos' });

  required(path.currentPassword, { message: 'Ingresá tu contraseña actual' });
  required(path.newPassword, { message: 'Creá una contraseña nueva' });
  minLength(path.newPassword, 8, { message: 'Mínimo 8 caracteres' });
  required(path.confirmPassword, { message: 'Repetí la contraseña' });
  validate(path.confirmPassword, (ctx) =>
    ctx.value() === ctx.valueOf(path.newPassword)
      ? undefined
      : { kind: 'mismatch', message: 'Las contraseñas no coinciden' },
  );
});

type ChangePasswordStep = 'idle' | 'code' | 'password' | 'done';

/**
 * `/cuenta/seguridad` - cambiar contraseña (código por email + contraseña actual como segundo
 * factor) y Sesiones (revocar todo - ver `AuthService.revokeAllSessions`, no hay tracking fiable
 * de dispositivos individuales en este proyecto, ver ACCOUNT_SECURITY.md).
 */
@Component({
  selector: 'app-account-security',
  imports: [FormField, DatePipe],
  templateUrl: './account-security.html',
  styleUrl: './account-security.css',
})
export default class AccountSecurity {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly security = signal<SecurityStatus | null>(null);

  private readonly changePasswordModelSignal = signal<ChangePasswordModel>(
    emptyChangePasswordModel(),
  );
  protected readonly changePasswordForm = form(this.changePasswordModelSignal, changePasswordSchema);
  protected readonly changeStep = signal<ChangePasswordStep>('idle');
  protected readonly changeSubmitting = signal(false);
  protected readonly changeError = signal<string | null>(null);
  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  private changeAuthorization: string | null = null;

  protected readonly revokingSessions = signal(false);

  constructor() {
    void this.loadSecurityStatus();
  }

  private async loadSecurityStatus(): Promise<void> {
    this.security.set(await this.authService.getSecurityStatus());
  }

  protected async startPasswordChange(): Promise<void> {
    this.changeSubmitting.set(true);
    this.changeError.set(null);
    const result = await this.authService.requestPasswordChange();
    this.changeSubmitting.set(false);

    if (result.success) {
      this.changeStep.set('code');
    } else {
      this.changeError.set(result.message ?? 'No pudimos enviar el código');
    }
  }

  protected async verifyChangeCode(event: Event): Promise<void> {
    event.preventDefault();
    this.changePasswordForm().markAsTouched();
    const code = this.changePasswordModelSignal().code.trim();
    if (!/^\d{6}$/.test(code)) return;

    this.changeSubmitting.set(true);
    this.changeError.set(null);
    const result = await this.authService.verifyPasswordChangeCode(code);
    this.changeSubmitting.set(false);

    if (result.success) {
      this.changeAuthorization = result.authorization;
      this.changeStep.set('password');
    } else {
      this.changeError.set(result.message ?? 'El código no es válido');
    }
  }

  protected async confirmPasswordChange(event: Event): Promise<void> {
    event.preventDefault();
    this.changePasswordForm().markAsTouched();
    if (!this.changePasswordForm().valid() || !this.changeAuthorization) return;

    const { currentPassword, newPassword } = this.changePasswordModelSignal();

    this.changeSubmitting.set(true);
    this.changeError.set(null);
    const result = await this.authService.confirmPasswordChange(
      this.changeAuthorization,
      currentPassword,
      newPassword,
    );
    this.changeSubmitting.set(false);

    if (result.success) {
      this.changeStep.set('done');
    } else {
      this.changeError.set(result.message ?? 'No pudimos actualizar tu contraseña');
    }
  }

  protected cancelPasswordChange(): void {
    this.changeStep.set('idle');
    this.changeError.set(null);
    this.changePasswordModelSignal.set(emptyChangePasswordModel());
    this.changeAuthorization = null;
  }

  protected goToLogin(): void {
    void this.router.navigateByUrl('/auth/login');
  }

  protected async revokeAllSessions(): Promise<void> {
    this.revokingSessions.set(true);
    const result = await this.authService.revokeAllSessions();
    this.revokingSessions.set(false);

    if (result.success) void this.router.navigateByUrl('/auth/login');
  }
}
