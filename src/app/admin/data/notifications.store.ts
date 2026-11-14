import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { AdminAuthService } from './admin-auth.service';
import type {
  AdminNotification,
  BulkNotificationAction,
  NotificationStreamEvent,
} from './notifications-admin.model';
import { NotificationsAdminService } from './notifications-admin.service';
import { createSseParser, reconnectDelayMs } from './notifications-stream.helper';

export type NotificationsConnection = 'idle' | 'connecting' | 'live' | 'reconnecting';

/** Cuántas notificaciones recientes mantiene el desplegable de la campana. */
const RECENT_LIMIT = 20;
/** El backend manda un latido cada 25 s: sin nada durante este tiempo, la conexión está muerta
 *  aunque el navegador todavía no lo haya notado (wifi caído, laptop que volvió de suspensión). */
const STALE_STREAM_MS = 70_000;

/**
 * Agrega `incoming` a `current` sin duplicar (un mismo aviso puede llegar por el stream Y por la
 * resincronización), ordenado del más nuevo al más viejo y recortado a `limit`. Función pura.
 */
export function mergeNotifications(
  current: readonly AdminNotification[],
  incoming: readonly AdminNotification[],
  limit: number,
): AdminNotification[] {
  const byId = new Map<string, AdminNotification>();
  for (const notification of current) byId.set(notification.id, notification);
  // Lo que llega es más fresco que lo que ya había: pisa el estado leído/archivado.
  for (const notification of incoming) byId.set(notification.id, notification);

  return [...byId.values()]
    .filter((notification) => !notification.archived)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .slice(0, limit);
}

/**
 * Estado en vivo del centro de notificaciones del panel: contador de no leídas, las más
 * recientes y la conexión en tiempo real (SSE).
 *
 * - Se conecta solo mientras hay sesión admin Y la pestaña está visible. Una pestaña en segundo
 *   plano suelta su conexión (los navegadores limitan las conexiones simultáneas por origen) y
 *   al volver reconecta y se pone al día.
 * - Sin polling: si la conexión se cae, reintenta con espera creciente; si no se cae, no hay
 *   ningún request periódico.
 * - El contador NUNCA se calcula sumando eventos: siempre es el número que manda el backend. Por
 *   eso un evento repetido o perdido no puede dejarlo desfasado, y varias pestañas (o varios
 *   dispositivos) del mismo admin muestran lo mismo.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly api = inject(NotificationsAdminService);
  private readonly auth = inject(AdminAuthService);

  private readonly recentSignal = signal<readonly AdminNotification[]>([]);
  private readonly unreadCountSignal = signal(0);
  private readonly connectionSignal = signal<NotificationsConnection>('idle');
  private readonly revisionSignal = signal(0);
  private readonly latestSignal = signal<AdminNotification | null>(null);
  private readonly visibleSignal = signal(
    typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );

  readonly recent = this.recentSignal.asReadonly();
  readonly unreadCount = this.unreadCountSignal.asReadonly();
  readonly connection = this.connectionSignal.asReadonly();
  /** Cambia cada vez que algo se modificó en el servidor - las páginas lo observan para
   *  recargar lo que tengan en pantalla. */
  readonly revision = this.revisionSignal.asReadonly();
  /** La última notificación que llegó EN VIVO (no por resincronización) - para anunciarla. */
  readonly latest = this.latestSignal.asReadonly();
  readonly hasUnread = computed(() => this.unreadCountSignal() > 0);

  private controller: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private staleTimer: ReturnType<typeof setTimeout> | undefined;
  private attempt = 0;
  /** `false` hasta el primer `ready` de la sesión: distingue la carga inicial de una reconexión. */
  private hasSynced = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () =>
        this.visibleSignal.set(document.visibilityState !== 'hidden'),
      );
    }

    // Único lugar que decide conectar/desconectar. Depende del token (no solo de "hay sesión"):
    // al renovar la sesión el token cambia y hay que reabrir el stream con el nuevo, porque el
    // backend corta cada stream cuando vence el token con el que se abrió.
    effect(() => {
      const token = this.auth.token();
      const authenticated = this.auth.isAuthenticated();
      const visible = this.visibleSignal();
      untracked(() => {
        this.disconnect();
        if (!authenticated || !token) {
          this.reset();
          return;
        }
        if (visible) this.connect(token);
      });
    });
  }

  // -----------------------------------------------------------------------------------------
  // Acciones - actualizan la UI al instante y dejan que el backend confirme el contador
  // -----------------------------------------------------------------------------------------

  async markRead(id: string, read = true): Promise<void> {
    this.patchLocal(id, { read });
    try {
      await this.api.setRead(id, read);
    } finally {
      await this.refreshCount();
    }
  }

  async archive(id: string): Promise<void> {
    this.recentSignal.update((list) => list.filter((notification) => notification.id !== id));
    try {
      await this.api.setArchived(id, true);
    } finally {
      await this.refreshCount();
    }
  }

  async markAllRead(): Promise<void> {
    this.recentSignal.update((list) => list.map((notification) => ({ ...notification, read: true })));
    this.unreadCountSignal.set(0);
    try {
      await this.api.markAllRead();
    } finally {
      await this.refreshCount();
    }
  }

  async bulk(ids: readonly string[], action: BulkNotificationAction): Promise<number> {
    const result = await this.api.bulk(ids, action);
    this.unreadCountSignal.set(result.unreadCount);
    await this.loadRecent();
    this.bumpRevision();
    return result.updated;
  }

  /** Vuelve a pedir las más recientes y el contador real. */
  async loadRecent(): Promise<void> {
    const page = await this.api.list({ limit: RECENT_LIMIT });
    this.recentSignal.set(mergeNotifications([], page.data, RECENT_LIMIT));
    this.unreadCountSignal.set(page.unreadCount);
  }

  // -----------------------------------------------------------------------------------------
  // Conexión en tiempo real
  // -----------------------------------------------------------------------------------------

  private connect(token: string): void {
    const controller = new AbortController();
    this.controller = controller;
    this.connectionSignal.set(this.attempt === 0 ? 'connecting' : 'reconnecting');

    void this.readStream(token, controller).then((shouldRetry) => {
      // Si este intento ya fue reemplazado (cambió el token, se ocultó la pestaña), no hace nada.
      if (this.controller !== controller) return;
      this.controller = null;
      clearTimeout(this.staleTimer);
      if (shouldRetry) this.scheduleReconnect(token);
      else this.connectionSignal.set('idle');
    });
  }

  /** Devuelve `true` si conviene reintentar (corte de red, stream cerrado por el servidor). */
  private async readStream(token: string, controller: AbortController): Promise<boolean> {
    try {
      const response = await fetch(`${this.api.baseUrl}/stream`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
        cache: 'no-store',
      });

      if (response.status === 401 || response.status === 403) {
        // Sesión vencida o revocada: reintentar con el mismo token sería un loop de 401. El
        // resto del panel ya maneja el aviso de sesión vencida ante su próximo request.
        return false;
      }
      if (!response.ok || !response.body) return true;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const parse = createSseParser();
      this.armStaleTimer(controller);

      for (;;) {
        const { done, value } = await reader.read();
        if (done) return true;
        this.armStaleTimer(controller);
        for (const event of parse(decoder.decode(value, { stream: true }))) {
          await this.handleEvent(event);
        }
      }
    } catch {
      // Caída de red, o el corte por inactividad de `armStaleTimer`. Si en cambio lo abortó
      // `disconnect()`, este intento ya fue reemplazado y `connect` ignora el resultado.
      return true;
    }
  }

  private async handleEvent(event: NotificationStreamEvent): Promise<void> {
    switch (event.type) {
      case 'ready':
        // Recién acá la conexión es real. Todo lo que pasó mientras no estábamos escuchando se
        // recupera por REST - el stream solo trae lo que ocurra de ahora en más.
        this.attempt = 0;
        this.connectionSignal.set('live');
        await this.resync();
        return;
      case 'notification.created':
        this.recentSignal.update((list) => mergeNotifications(list, [event.notification], RECENT_LIMIT));
        this.unreadCountSignal.set(event.unreadCount);
        this.latestSignal.set(event.notification);
        this.bumpRevision();
        return;
      case 'notifications.changed':
        // Otra pestaña/dispositivo marcó algo como leído o archivado.
        this.unreadCountSignal.set(event.unreadCount);
        await this.loadRecent().catch(() => undefined);
        this.bumpRevision();
        return;
      default:
        return;
    }
  }

  private async resync(): Promise<void> {
    const isReconnect = this.hasSynced;
    try {
      // Se pide el estado completo y no solo "lo nuevo": mientras no escuchábamos también pudo
      // cambiar lo viejo (algo marcado como leído o archivado desde otro dispositivo), y eso un
      // filtro por fecha no lo trae.
      await this.loadRecent();
      this.hasSynced = true;
      // En una reconexión, lo que las páginas tengan en pantalla puede estar viejo.
      if (isReconnect) this.bumpRevision();
    } catch {
      /* Sin conexión todavía - el próximo `ready` lo vuelve a intentar. */
    }
  }

  private scheduleReconnect(token: string): void {
    this.attempt += 1;
    this.connectionSignal.set('reconnecting');
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      // El token pudo haber cambiado o la sesión terminado mientras esperábamos.
      if (this.auth.token() === token && this.auth.isAuthenticated() && this.visibleSignal()) {
        this.connect(token);
      }
    }, reconnectDelayMs(this.attempt));
  }

  private armStaleTimer(controller: AbortController): void {
    clearTimeout(this.staleTimer);
    this.staleTimer = setTimeout(() => controller.abort(), STALE_STREAM_MS);
  }

  private disconnect(): void {
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.staleTimer);
    const controller = this.controller;
    this.controller = null;
    controller?.abort();
    this.attempt = 0;
  }

  private reset(): void {
    this.recentSignal.set([]);
    this.unreadCountSignal.set(0);
    this.latestSignal.set(null);
    this.connectionSignal.set('idle');
    this.hasSynced = false;
  }

  private async refreshCount(): Promise<void> {
    try {
      const page = await this.api.list({ limit: 1 });
      this.unreadCountSignal.set(page.unreadCount);
    } catch {
      /* El próximo evento del stream trae el contador real. */
    }
    this.bumpRevision();
  }

  private patchLocal(id: string, patch: Partial<AdminNotification>): void {
    this.recentSignal.update((list) =>
      list.map((notification) => (notification.id === id ? { ...notification, ...patch } : notification)),
    );
  }

  private bumpRevision(): void {
    this.revisionSignal.update((value) => value + 1);
  }
}
