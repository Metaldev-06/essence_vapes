import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

/**
 * Montado una sola vez en el shell de la tienda (`ecommerce.html`) - avisa antes de que el JWT
 * venza (ofreciendo renovar sin volver a loguearse) y, si ya venció, redirige a `/auth/login` en
 * vez de dejar la pantalla rota con requests fallando en silencio (ver tarea del usuario,
 * 2026-11-13 - pidió lo mismo tanto para el admin como para la vista de usuario).
 */
@Component({
  selector: 'app-session-expiry-modal',
  templateUrl: './session-expiry-modal.html',
  styleUrl: './session-expiry-modal.css',
})
export class SessionExpiryModal {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly state = this.authService.sessionState;
  protected readonly renewing = this.authService.renewing;

  protected async renew(): Promise<void> {
    await this.authService.renewSession();
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigateByUrl('/auth/login');
  }

  protected goToLogin(): void {
    void this.router.navigateByUrl('/auth/login');
  }
}
