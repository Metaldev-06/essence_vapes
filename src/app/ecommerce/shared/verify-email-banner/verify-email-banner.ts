import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';

const DISMISSED_KEY = 'ev:verify-email-banner-dismissed';

/**
 * Banner global y no bloqueante: una cuenta sin verificar sigue pudiendo usar el carrito y
 * favoritos con normalidad (decisión explícita - esta tienda todavía no tiene checkout, no hay
 * ninguna función realmente "privada" que gatear). Se oculta en `/cuenta` (esa página ya tiene
 * su propio aviso con más contexto) y se puede descartar por el resto de la sesión del navegador.
 */
@Component({
  selector: 'app-verify-email-banner',
  imports: [RouterLink],
  templateUrl: './verify-email-banner.html',
  styleUrl: './verify-email-banner.css',
})
export class VerifyEmailBanner {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly dismissed = signal(this.readDismissed());
  protected readonly resending = signal(false);
  protected readonly message = signal<string | null>(null);

  protected readonly visible = computed(() => {
    const user = this.authService.user();
    return (
      !!user &&
      !user.emailVerified &&
      !this.dismissed() &&
      !this.currentUrl().startsWith('/cuenta')
    );
  });

  protected async resend(): Promise<void> {
    this.resending.set(true);
    const result = await this.authService.resendEmailVerification();
    this.resending.set(false);
    this.message.set(
      result.success ? 'Te enviamos un correo de verificación.' : result.message ?? 'No pudimos enviarlo',
    );
  }

  protected dismiss(): void {
    this.dismissed.set(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* Sin storage disponible, solo se descarta para esta vista. */
    }
  }

  private readDismissed(): boolean {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  }
}
