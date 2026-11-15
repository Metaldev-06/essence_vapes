import { Component, DOCUMENT, ElementRef, computed, effect, inject, viewChild } from '@angular/core';

import { RateLimitService } from '../rate-limit.service';

/** "0:42", "1:05" - minutos sin cero adelante, segundos siempre con dos cifras. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Aviso de "demasiadas solicitudes" (HTTP 429) con la cuenta regresiva real hasta que el
 * servidor vuelva a aceptar pedidos. Montado una sola vez en el componente raíz: sirve igual en
 * la tienda y en el panel. Se cierra solo al llegar a 0, cuando `rateLimitInterceptor` reintenta
 * lo que había quedado pendiente.
 */
@Component({
  selector: 'app-rate-limit-modal',
  templateUrl: './rate-limit-modal.html',
  styleUrl: './rate-limit-modal.css',
})
export class RateLimitModal {
  protected readonly rateLimit = inject(RateLimitService);

  protected readonly countdown = computed(() => formatCountdown(this.rateLimit.remainingSeconds()));
  protected readonly progressPercent = computed(() => Math.round(this.rateLimit.progress() * 100));

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');

  constructor() {
    // Al abrirse, el foco pasa al aviso (lectores de pantalla y teclado).
    effect(() => this.dialog()?.nativeElement.focus());

    // La página de atrás tampoco se puede desplazar mientras dura la espera.
    const root = inject(DOCUMENT).documentElement;
    let previous: { overflow: string; paddingRight: string } | null = null;
    effect(() => {
      if (this.rateLimit.isBlocked() && !previous) {
        previous = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
        // Sin la barra de scroll el contenido se correría a la derecha: se compensa su ancho.
        const scrollbarWidth = window.innerWidth - root.clientWidth;
        root.style.overflow = 'hidden';
        if (scrollbarWidth > 0) root.style.paddingRight = `${scrollbarWidth}px`;
      } else if (!this.rateLimit.isBlocked() && previous) {
        root.style.overflow = previous.overflow;
        root.style.paddingRight = previous.paddingRight;
        previous = null;
      }
    });
  }
}
