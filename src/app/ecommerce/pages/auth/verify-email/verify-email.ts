import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import type { EmailVerificationOutcome } from '../../../../core/auth/auth.model';

type ScreenState = 'idle' | 'confirming' | EmailVerificationOutcome | 'no_token' | 'error';

/**
 * `/auth/verificar-email?token=...`. A propósito NO confirma automáticamente al cargar la
 * página (un GET del previsualizador de algunos clientes de correo no debe consumir el token
 * solo) - requiere un click explícito que dispara el POST real.
 */
@Component({
  selector: 'app-verify-email',
  imports: [RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export default class VerifyEmail {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);

  private readonly token = this.route.snapshot.queryParamMap.get('token');
  protected readonly state = signal<ScreenState>(this.token ? 'idle' : 'no_token');
  protected readonly errorMessage = signal<string | null>(null);

  protected get destinationLink(): string {
    return this.authService.isAuthenticated() ? '/cuenta' : '/auth/login';
  }

  protected async confirm(): Promise<void> {
    if (!this.token) return;

    this.state.set('confirming');
    const result = await this.authService.confirmEmailVerification(this.token);

    if (!result.success) {
      this.state.set('error');
      this.errorMessage.set(result.message);
      return;
    }
    this.state.set(result.outcome);
  }
}
