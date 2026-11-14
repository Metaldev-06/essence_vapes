import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AdminAuthService } from '../../data/admin-auth.service';

/**
 * Montado una sola vez en el shell del admin (`admin.html`) - avisa antes de que el JWT venza
 * (ofreciendo renovar sin volver a loguearse) y, si ya venció, redirige a `/admin/login` en vez
 * de dejar la pantalla rota con requests fallando en silencio (ver tarea del usuario,
 * 2026-11-13 - reportó justo este caso con capturas de /admin/reportes).
 */
@Component({
  selector: 'app-session-expiry-modal',
  templateUrl: './session-expiry-modal.html',
  styleUrl: './session-expiry-modal.css',
})
export class SessionExpiryModal {
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly state = this.adminAuthService.sessionState;
  protected readonly renewing = this.adminAuthService.renewing;

  protected async renew(): Promise<void> {
    await this.adminAuthService.renewSession();
  }

  protected logout(): void {
    this.adminAuthService.logout();
    void this.router.navigateByUrl('/admin/login');
  }

  protected goToLogin(): void {
    void this.router.navigateByUrl('/admin/login');
  }
}
