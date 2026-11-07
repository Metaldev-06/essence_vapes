import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';

const CODE_LENGTH = 6;
/** Solo para la cuenta regresiva visual - el backend es la única fuente de verdad sobre si el
 *  código venció (ver `PASSWORD_RESET_CODE_TTL_MS` en el backend). */
const DISPLAY_TTL_SECONDS = 600;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Paso 2 de "olvidé mi contraseña" (`/auth/verificar-codigo?email=...`). Al validar el código,
 * el backend devuelve una autorización de un solo uso que se pasa a `/auth/restablecer-contrasena`
 * vía `router.navigate(..., { state })` - nunca por query param, para no dejarla en el historial
 * del navegador (ver `reset-password.ts`).
 */
@Component({
  selector: 'app-verify-code',
  imports: [RouterLink],
  templateUrl: './verify-code.html',
  styleUrl: './verify-code.css',
})
export default class VerifyCode implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private timer?: ReturnType<typeof setInterval>;

  protected readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';
  protected readonly digits = signal<string[]>(Array(CODE_LENGTH).fill(''));
  protected readonly code = computed(() => this.digits().join(''));
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly resending = signal(false);
  protected readonly resent = signal(false);
  protected readonly secondsLeft = signal(DISPLAY_TTL_SECONDS);
  protected readonly resendCooldown = signal(0);
  protected readonly expired = computed(() => this.secondsLeft() <= 0);

  constructor() {
    if (!this.email) void this.router.navigateByUrl('/auth/olvide-contrasena');
    this.timer = setInterval(() => {
      this.secondsLeft.update((value) => Math.max(0, value - 1));
      this.resendCooldown.update((value) => Math.max(0, value - 1));
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  protected formattedTime(): string {
    const total = this.secondsLeft();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  protected onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1);
    this.digits.update((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
    input.value = value;

    if (value && index < CODE_LENGTH - 1) {
      this.focusDigit(index + 1);
    }
    if (this.code().length === CODE_LENGTH) void this.submit();
  }

  protected onDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      this.focusDigit(index - 1);
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    this.digits.set(Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] ?? ''));
    this.focusDigit(Math.min(pasted.length, CODE_LENGTH - 1));
    if (pasted.length === CODE_LENGTH) void this.submit();
  }

  private focusDigit(index: number): void {
    queueMicrotask(() => {
      document.getElementById(`code-digit-${index}`)?.focus();
    });
  }

  protected async submit(): Promise<void> {
    if (this.code().length !== CODE_LENGTH || this.submitting()) return;

    this.submitting.set(true);
    this.error.set(null);
    const result = await this.authService.verifyPasswordResetCode(this.email, this.code());
    this.submitting.set(false);

    if (result.success) {
      void this.router.navigate(['/auth/restablecer-contrasena'], {
        state: { resetAuthorization: result.authorization },
      });
    } else {
      this.error.set(result.message ?? 'El código no es válido');
      this.digits.set(Array(CODE_LENGTH).fill(''));
      this.focusDigit(0);
    }
  }

  protected async resend(): Promise<void> {
    if (this.resendCooldown() > 0 || this.resending()) return;

    this.resending.set(true);
    this.error.set(null);
    const result = await this.authService.forgotPassword(this.email);
    this.resending.set(false);

    if (result.success) {
      this.resent.set(true);
      this.secondsLeft.set(DISPLAY_TTL_SECONDS);
      this.resendCooldown.set(RESEND_COOLDOWN_SECONDS);
      this.digits.set(Array(CODE_LENGTH).fill(''));
      this.focusDigit(0);
    } else {
      this.error.set(result.message ?? 'No pudimos reenviar el código');
    }
  }
}
