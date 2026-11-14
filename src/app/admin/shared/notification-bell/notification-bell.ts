import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { AdminNotification } from '../../data/notifications-admin.model';
import { NOTIFICATION_PRIORITY_LABELS } from '../../data/notifications-admin.model';
import { NotificationsStore } from '../../data/notifications.store';
import { formatRelativeTime } from '../../data/relative-time.helper';
import { NotificationIcon } from '../notification-icon/notification-icon';

/** Cuántas se muestran en el desplegable - el resto está en la página completa. */
const DROPDOWN_LIMIT = 8;
const ANNOUNCE_MS = 6_000;

/**
 * Campana de la barra superior: contador de no leídas + desplegable con las más recientes.
 *
 * Accesibilidad: el botón expone `aria-expanded`/`aria-controls` y su nombre incluye la cantidad
 * sin leer; Escape cierra y devuelve el foco al botón; una región `aria-live` anuncia cada
 * notificación que llega en vivo sin mover el foco de lo que la persona esté haciendo.
 */
@Component({
  selector: 'app-notification-bell',
  imports: [RouterLink, NotificationIcon],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class NotificationBell {
  protected readonly store = inject(NotificationsStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected readonly open = signal(false);
  protected readonly markingAll = signal(false);
  protected readonly priorityLabels = NOTIFICATION_PRIORITY_LABELS;

  /** Reloj propio para el "hace X min" - se refresca una vez por minuto, no en cada render. */
  private readonly now = signal(Date.now());

  protected readonly items = computed(() => {
    const now = this.now();
    return this.store
      .recent()
      .slice(0, DROPDOWN_LIMIT)
      .map((notification) => ({
        notification,
        relativeTime: formatRelativeTime(notification.createdAt, now),
      }));
  });

  protected readonly badge = computed(() => {
    const count = this.store.unreadCount();
    return count > 99 ? '99+' : String(count);
  });

  protected readonly triggerLabel = computed(() => {
    const count = this.store.unreadCount();
    if (count === 0) return 'Notificaciones';
    return `Notificaciones, ${count} sin leer`;
  });

  /** Texto para la región `aria-live` y para el aviso visual breve. */
  protected readonly announcement = signal<AdminNotification | null>(null);
  private announcementTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const clock = setInterval(() => this.now.set(Date.now()), 60_000);
    this.destroyRef.onDestroy(() => {
      clearInterval(clock);
      clearTimeout(this.announcementTimer);
    });

    effect(() => {
      const latest = this.store.latest();
      if (!latest) return;
      untracked(() => {
        this.now.set(Date.now());
        // Con el desplegable abierto ya se ve aparecer en la lista: no hace falta el aviso.
        if (this.open()) return;
        this.announcement.set(latest);
        clearTimeout(this.announcementTimer);
        this.announcementTimer = setTimeout(() => this.announcement.set(null), ANNOUNCE_MS);
      });
    });
  }

  protected toggle(): void {
    this.open.update((value) => !value);
    if (this.open()) {
      this.now.set(Date.now());
      this.dismissAnnouncement();
    }
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onEscape(): void {
    if (!this.open()) return;
    this.close();
    this.trigger().nativeElement.focus();
  }

  protected dismissAnnouncement(): void {
    clearTimeout(this.announcementTimer);
    this.announcement.set(null);
  }

  /** Abrir una notificación la marca como leída y lleva al recurso (o a la página completa). */
  protected openNotification(notification: AdminNotification): void {
    this.close();
    this.dismissAnnouncement();
    if (!notification.read) void this.store.markRead(notification.id).catch(() => undefined);
    void this.router.navigateByUrl(notification.resourceUrl ?? '/admin/notificaciones');
  }

  protected async markAllRead(): Promise<void> {
    this.markingAll.set(true);
    try {
      await this.store.markAllRead();
    } catch {
      /* El contador real vuelve con el próximo evento del stream. */
    } finally {
      this.markingAll.set(false);
    }
  }
}
