import { buildOrderTimeline } from './build-order-timeline.helper';
import type { Order } from '../../../../core/orders/order.model';
import type { OrderAuditLogRecord, PaymentAttemptRecord } from '../../../data/orders-admin.service';

const baseOrder: Order = {
  id: 'order-1',
  status: 'paid',
  paymentStatus: 'approved',
  subtotalValue: 1000,
  subtotal: '$1.000',
  totalValue: 1000,
  total: '$1.000',
  currency: 'ARS',
  buyerName: 'Juana Pérez',
  buyerEmail: 'juana@example.com',
  deliveryMethod: 'pickup',
  logisticsStatus: 'picked_up',
  shippingCostPending: false,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-02T10:00:00.000Z',
  items: [],
};

const makeAttempt = (overrides: Partial<PaymentAttemptRecord>): PaymentAttemptRecord => ({
  id: 'attempt-1',
  orderId: 'order-1',
  idempotencyKey: 'key-1',
  mpOrderId: null,
  mpPaymentId: null,
  paymentMethodType: 'credit_card',
  paymentMethodId: null,
  status: 'approved',
  statusDetail: null,
  failureReason: null,
  createdAt: '2026-11-01T10:05:00.000Z',
  updatedAt: '2026-11-01T10:05:00.000Z',
  ...overrides,
});

const makeAuditEntry = (overrides: Partial<OrderAuditLogRecord>): OrderAuditLogRecord => ({
  id: 'audit-1',
  adminId: 'admin-1',
  adminEmail: 'admin@essencevapes.com.ar',
  action: 'logistics_status_updated',
  orderId: 'order-1',
  detail: 'pending_preparation -> picked_up',
  createdAt: '2026-11-02T09:00:00.000Z',
  ...overrides,
});

describe('buildOrderTimeline', () => {
  it('siempre incluye "Pedido creado" como el primer evento cuando es el más antiguo', () => {
    const timeline = buildOrderTimeline(baseOrder, [], []);
    expect(timeline).toHaveLength(1);
    expect(timeline[0].title).toBe('Pedido creado');
    expect(timeline[0].actor).toBe('Juana Pérez');
  });

  it('ordena cronológicamente intentos de pago y auditoría, sin importar el orden de entrada', () => {
    const attempt = makeAttempt({ createdAt: '2026-11-01T10:05:00.000Z', status: 'approved' });
    const audit = makeAuditEntry({ createdAt: '2026-11-02T09:00:00.000Z' });

    // Pasados en orden inverso a propósito - el resultado debe quedar ordenado igual.
    const timeline = buildOrderTimeline(baseOrder, [attempt], [audit]);

    expect(timeline.map((e) => e.title)).toEqual([
      'Pedido creado',
      'Pago aprobado',
      'Estado logístico actualizado',
    ]);
  });

  it('un pago rechazado se etiqueta como tal y conserva el motivo', () => {
    const attempt = makeAttempt({ status: 'rejected', statusDetail: 'cc_rejected_insufficient_amount' });
    const timeline = buildOrderTimeline(baseOrder, [attempt], []);
    const paymentEvent = timeline.find((e) => e.id === 'attempt-attempt-1');
    expect(paymentEvent?.title).toBe('Pago rechazado');
    expect(paymentEvent?.detail).toBe('cc_rejected_insufficient_amount');
  });

  it('sin intentos de pago ni auditoría, solo queda el evento de creación', () => {
    const timeline = buildOrderTimeline(baseOrder, [], []);
    expect(timeline).toHaveLength(1);
  });
});
