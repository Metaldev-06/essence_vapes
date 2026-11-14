import { Component } from '@angular/core';

import { Breadcrumbs } from '../../shared/breadcrumbs/breadcrumbs';
import { NotificationBell } from '../../shared/notification-bell/notification-bell';

/**
 * Barra superior del panel: la ruta de navegación a la izquierda y las acciones globales (hoy,
 * la campana de notificaciones) a la derecha. Queda fija arriba al hacer scroll en escritorio,
 * así la campana está siempre a un clic.
 */
@Component({
  selector: 'app-topbar',
  imports: [Breadcrumbs, NotificationBell],
  template: `
    <header class="topbar">
      <div class="topbar-trail">
        <app-breadcrumbs />
      </div>
      <div class="topbar-actions">
        <app-notification-bell />
      </div>
    </header>
  `,
  styles: `
    :host {
      position: sticky;
      top: 0;
      z-index: 15;
      display: block;
      /* Fondo sólido a propósito (sin backdrop-filter): un filtro acá convertiría a la barra
         en el contenedor de los hijos con position: fixed, y rompería el panel en mobile. */
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-border-subtle);
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 64px;
      padding: 12px 44px;
    }

    .topbar-trail {
      min-width: 0;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-left: auto;
    }

    @media (max-width: 860px) {
      /* En mobile el sidebar ya es una franja fija arriba: la barra acompaña el scroll. */
      :host {
        position: static;
      }

      .topbar {
        min-height: 56px;
        padding: 8px 16px;
      }
    }
  `,
})
export class Topbar {}
