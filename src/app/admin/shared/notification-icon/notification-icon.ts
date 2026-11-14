import { Component, input } from '@angular/core';

import type { NotificationCategory, NotificationPriority } from '../../data/notifications-admin.model';

/**
 * Icono de una notificación según su categoría, teñido según su prioridad. Puramente decorativo
 * (`aria-hidden`): la categoría y la prioridad siempre se comunican también con texto.
 */
@Component({
  selector: 'app-notification-icon',
  template: `
    <span class="notification-icon" [class]="'priority-' + priority()" aria-hidden="true">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        @switch (category()) {
          @case ('orders') {
            <path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 8H6" />
            <circle cx="9" cy="20" r="1.5" />
            <circle cx="17" cy="20" r="1.5" />
          }
          @case ('inventory') {
            <path d="M3 8l9-4 9 4-9 4-9-4Z" />
            <path d="M3 8v9l9 4 9-4V8" />
            <path d="M12 12v9" />
          }
          @case ('payments') {
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
            <path d="M6 15h4" />
          }
          @case ('customers') {
            <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            <path d="m3.5 6.5 8.5 7 8.5-7" />
          }
          @case ('security') {
            <path d="M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6l-8-3Z" />
            <path d="m9 12 2 2 4-4" />
          }
          @default {
            <path d="M12 3 2 20h20L12 3Z" />
            <path d="M12 10v4M12 17v.5" />
          }
        }
      </svg>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }

    .notification-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 14%, transparent);
    }

    .priority-critical {
      color: var(--color-danger);
      background: color-mix(in srgb, var(--color-danger) 16%, transparent);
    }

    .priority-high {
      color: #fbbf24;
      background: color-mix(in srgb, #fbbf24 15%, transparent);
    }

    .priority-low {
      color: var(--color-text-muted);
      background: color-mix(in srgb, var(--color-text-muted) 14%, transparent);
    }
  `,
})
export class NotificationIcon {
  readonly category = input.required<NotificationCategory>();
  readonly priority = input<NotificationPriority>('normal');
}
