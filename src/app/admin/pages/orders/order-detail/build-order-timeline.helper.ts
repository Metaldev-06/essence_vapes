import type { Order, PaymentStatus } from '../../../../core/orders/order.model';
import type { OrderAuditLogRecord, PaymentAttemptRecord } from '../../../data/orders-admin.service';

export interface TimelineEvent {
  readonly id: string;
  readonly at: string;
  readonly title: string;
  readonly detail: string | null;
  readonly actor: string;
  readonly origin: string;
}

const paymentAttemptTitle = (status: PaymentStatus): string => {
  switch (status) {
    case 'approved':
      return 'Pago aprobado';
    case 'rejected':
      return 'Pago rechazado';
    case 'in_process':
      return 'Pago en revisión';
    case 'refunded':
      return 'Pago reembolsado';
    case 'charged_back':
      return 'Contracargo';
    case 'cancelled':
      return 'Pago cancelado';
    default:
      return 'Intento de pago iniciado';
  }
};

/**
 * Línea de tiempo cronológica de un pedido (ver tarea, punto 7.3) - fusiona tres fuentes que ya
 * se traen por separado (creación del pedido, intentos de pago, auditoría de cambios logísticos)
 * en una sola lista ordenada por fecha, función pura para poder testearla directo. No inventa
 * eventos: solo reordena/etiqueta datos que ya existen en el backend.
 */
export const buildOrderTimeline = (
  order: Order,
  attempts: readonly PaymentAttemptRecord[],
  auditLog: readonly OrderAuditLogRecord[],
): readonly TimelineEvent[] => {
  const events: TimelineEvent[] = [
    {
      id: `created-${order.id}`,
      at: order.createdAt,
      title: 'Pedido creado',
      detail: null,
      actor: order.buyerName,
      origin: 'Checkout',
    },
    ...attempts.map(
      (attempt): TimelineEvent => ({
        id: `attempt-${attempt.id}`,
        at: attempt.createdAt,
        title: paymentAttemptTitle(attempt.status),
        detail: attempt.statusDetail ?? attempt.failureReason ?? null,
        actor: order.buyerName,
        origin: 'Mercado Pago',
      }),
    ),
    ...auditLog.map(
      (entry): TimelineEvent => ({
        id: `audit-${entry.id}`,
        at: entry.createdAt,
        title: 'Estado logístico actualizado',
        detail: entry.detail,
        actor: entry.adminEmail,
        origin: 'Panel admin',
      }),
    ),
  ];

  return events.slice().sort((a, b) => a.at.localeCompare(b.at));
};
