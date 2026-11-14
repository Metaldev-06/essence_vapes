import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { IS_ADMIN_REQUEST } from '../../core/auth/admin-request.context';
import { API_BASE_URL } from '../../core/config/api.config';
import type {
  AdminNotification,
  BulkNotificationAction,
  GlobalNotificationSettings,
  NotificationPreferencesView,
  NotificationsPage,
  NotificationsQuery,
  PushDevice,
  StockThreshold,
  UpdatePreferencesPayload,
} from './notifications-admin.model';

const ADMIN_CONTEXT = new HttpContext().set(IS_ADMIN_REQUEST, true);

/** Cliente HTTP del centro de notificaciones. El backend resuelve el destinatario a partir del
 *  token: ninguna llamada manda un id de administrador. */
@Injectable({ providedIn: 'root' })
export class NotificationsAdminService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = `${API_BASE_URL}/notifications`;

  list(query: NotificationsQuery = {}): Promise<NotificationsPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params = params.set(key, String(value));
    }
    return firstValueFrom(
      this.http.get<NotificationsPage>(this.baseUrl, { params, context: ADMIN_CONTEXT }),
    );
  }

  setRead(id: string, read: boolean): Promise<AdminNotification> {
    return firstValueFrom(
      this.http.patch<AdminNotification>(
        `${this.baseUrl}/${id}/${read ? 'read' : 'unread'}`,
        {},
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  setArchived(id: string, archived: boolean): Promise<AdminNotification> {
    return firstValueFrom(
      this.http.patch<AdminNotification>(
        `${this.baseUrl}/${id}/${archived ? 'archive' : 'unarchive'}`,
        {},
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  markAllRead(): Promise<{ updated: number; unreadCount: number }> {
    return firstValueFrom(
      this.http.post<{ updated: number; unreadCount: number }>(
        `${this.baseUrl}/read-all`,
        {},
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  bulk(
    ids: readonly string[],
    action: BulkNotificationAction,
  ): Promise<{ updated: number; unreadCount: number }> {
    return firstValueFrom(
      this.http.post<{ updated: number; unreadCount: number }>(
        `${this.baseUrl}/bulk`,
        { ids, action },
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  getPreferences(): Promise<NotificationPreferencesView> {
    return firstValueFrom(
      this.http.get<NotificationPreferencesView>(`${this.baseUrl}/preferences`, {
        context: ADMIN_CONTEXT,
      }),
    );
  }

  updatePreferences(payload: UpdatePreferencesPayload): Promise<NotificationPreferencesView> {
    return firstValueFrom(
      this.http.put<NotificationPreferencesView>(`${this.baseUrl}/preferences`, payload, {
        context: ADMIN_CONTEXT,
      }),
    );
  }

  updateGlobalSettings(
    payload: Partial<GlobalNotificationSettings>,
  ): Promise<GlobalNotificationSettings> {
    return firstValueFrom(
      this.http.put<GlobalNotificationSettings>(`${this.baseUrl}/settings`, payload, {
        context: ADMIN_CONTEXT,
      }),
    );
  }

  listStockThresholds(): Promise<StockThreshold[]> {
    return firstValueFrom(
      this.http.get<StockThreshold[]>(`${this.baseUrl}/stock-thresholds`, { context: ADMIN_CONTEXT }),
    );
  }

  setStockThreshold(productId: string, variantId: string, threshold: number): Promise<StockThreshold[]> {
    return firstValueFrom(
      this.http.put<StockThreshold[]>(
        `${this.baseUrl}/stock-thresholds`,
        { productId, variantId, threshold },
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  removeStockThreshold(productId: string, variantId: string): Promise<StockThreshold[]> {
    return firstValueFrom(
      this.http.delete<StockThreshold[]>(`${this.baseUrl}/stock-thresholds`, {
        params: new HttpParams().set('productId', productId).set('variantId', variantId),
        context: ADMIN_CONTEXT,
      }),
    );
  }

  getPushPublicKey(): Promise<{ enabled: boolean; publicKey: string | null }> {
    return firstValueFrom(
      this.http.get<{ enabled: boolean; publicKey: string | null }>(`${this.baseUrl}/push/public-key`, {
        context: ADMIN_CONTEXT,
      }),
    );
  }

  listPushDevices(): Promise<PushDevice[]> {
    return firstValueFrom(
      this.http.get<PushDevice[]>(`${this.baseUrl}/push/subscriptions`, { context: ADMIN_CONTEXT }),
    );
  }

  registerPushDevice(subscription: PushSubscriptionJSON): Promise<PushDevice> {
    return firstValueFrom(
      this.http.post<PushDevice>(
        `${this.baseUrl}/push/subscriptions`,
        { endpoint: subscription.endpoint, keys: subscription.keys },
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  removePushDevice(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/push/subscriptions/${id}`, { context: ADMIN_CONTEXT }),
    );
  }

  sendTestPush(): Promise<{ attempted: number; delivered: number }> {
    return firstValueFrom(
      this.http.post<{ attempted: number; delivered: number }>(
        `${this.baseUrl}/push/test`,
        {},
        { context: ADMIN_CONTEXT },
      ),
    );
  }
}
