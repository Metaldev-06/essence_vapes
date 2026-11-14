export type NotificationCategory =
  | 'orders'
  | 'inventory'
  | 'payments'
  | 'customers'
  | 'security'
  | 'system';

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

export type NotificationStatusFilter = 'active' | 'unread' | 'read' | 'archived';

export type BulkNotificationAction = 'read' | 'unread' | 'archive' | 'unarchive' | 'delete';

export type DigestFrequency = 'off' | 'daily' | 'weekly';

export interface AdminNotification {
  readonly id: string;
  readonly type: string;
  readonly category: NotificationCategory;
  readonly priority: NotificationPriority;
  readonly title: string;
  readonly body: string;
  /** Ruta interna del panel (`/admin/...`) o `null` si el aviso no apunta a un recurso. */
  readonly resourceUrl: string | null;
  readonly resourceType: string | null;
  readonly resourceId: string | null;
  readonly read: boolean;
  readonly archived: boolean;
  readonly createdAt: string;
}

export interface NotificationsPage {
  readonly data: readonly AdminNotification[];
  readonly pagination: {
    readonly total: number;
    readonly pages: number;
    readonly current: number;
    readonly limit: number;
    readonly offset: number;
  };
  readonly unreadCount: number;
}

export interface NotificationsQuery {
  limit?: number;
  offset?: number;
  status?: NotificationStatusFilter;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  since?: string;
}

/** Eventos del stream SSE (`GET /notifications/stream`). */
export type NotificationStreamEvent =
  | { readonly type: 'ready' }
  | { readonly type: 'ping' }
  | {
      readonly type: 'notification.created';
      readonly notification: AdminNotification;
      readonly unreadCount: number;
    }
  | { readonly type: 'notifications.changed'; readonly unreadCount: number };

export interface EventPreference {
  readonly type: string;
  readonly category: NotificationCategory;
  readonly priority: NotificationPriority;
  readonly label: string;
  readonly description: string;
  readonly critical: boolean;
  readonly enabled: boolean;
  readonly inApp: boolean;
  readonly push: boolean;
  readonly email: boolean;
}

export interface PersonalNotificationSettings {
  readonly quietHoursEnabled: boolean;
  /** Minutos desde las 00:00 (hora de Argentina). */
  readonly quietHoursStart: number;
  readonly quietHoursEnd: number;
  readonly digestFrequency: DigestFrequency;
  readonly digestHour: number;
}

export interface GlobalNotificationSettings {
  readonly lowStockThreshold: number;
  readonly pendingPreparationHours: number;
  readonly pendingDispatchHours: number;
  readonly unansweredHours: number;
  readonly reorderReminderDays: number;
  readonly retentionDays: number;
}

export interface NotificationPreferencesView {
  readonly events: readonly EventPreference[];
  readonly settings: PersonalNotificationSettings;
  readonly global: GlobalNotificationSettings;
  /** Qué canales externos están configurados en el servidor. */
  readonly channels: { readonly push: boolean; readonly email: boolean };
}

export interface UpdatePreferencesPayload extends Partial<PersonalNotificationSettings> {
  events?: readonly Pick<EventPreference, 'type' | 'enabled' | 'inApp' | 'push' | 'email'>[];
}

export interface StockThreshold {
  readonly productId: string;
  readonly variantId: string;
  readonly label: string;
  readonly stock: number;
  readonly threshold: number;
  readonly state: 'ok' | 'low' | 'out';
}

export interface PushDevice {
  readonly id: string;
  /** Hash truncado del endpoint - permite reconocer "este dispositivo" sin exponer el endpoint. */
  readonly fingerprint: string;
  readonly deviceLabel: string;
  readonly createdAt: string;
  readonly lastUsedAt: string | null;
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  orders: 'Pedidos',
  inventory: 'Inventario',
  payments: 'Pagos',
  customers: 'Clientes',
  security: 'Seguridad',
  system: 'Sistema',
};

export const NOTIFICATION_CATEGORIES = Object.keys(
  NOTIFICATION_CATEGORY_LABELS,
) as readonly NotificationCategory[];

export const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
  critical: 'Crítica',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja',
};

export const NOTIFICATION_PRIORITIES = Object.keys(
  NOTIFICATION_PRIORITY_LABELS,
) as readonly NotificationPriority[];
