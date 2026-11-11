import type { DeliveryMethod, LogisticsStatus, OrderStatus, PaymentStatus } from './order.model';

/** Compartido por "Mis compras" (storefront) y el panel admin "Ventas/Pedidos") - una sola
 *  fuente de las etiquetas en español para los mismos enums que usa el backend. */
export const orderStatusLabel = (status: OrderStatus): string => {
  switch (status) {
    case 'awaiting_shipping_quote':
      return 'Esperando costo de envío';
    case 'pending_payment':
      return 'Esperando pago';
    case 'processing':
      return 'Pago en revisión';
    case 'paid':
      return 'Pagado';
    case 'cancelled':
      return 'Cancelado';
    case 'expired':
      return 'Vencido';
    case 'refunded':
      return 'Reembolsado';
    default:
      return status;
  }
};

export const paymentStatusLabel = (status: PaymentStatus): string => {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'in_process':
      return 'En revisión';
    case 'approved':
      return 'Aprobado';
    case 'rejected':
      return 'Rechazado';
    case 'cancelled':
      return 'Cancelado';
    case 'refunded':
      return 'Reembolsado';
    case 'charged_back':
      return 'Contracargo';
    default:
      return status;
  }
};

export const deliveryMethodLabel = (method: DeliveryMethod): string =>
  method === 'pickup' ? 'Retiro en el local' : 'Envío a domicilio';

export const logisticsStatusLabel = (status: LogisticsStatus): string => {
  switch (status) {
    case 'pending_preparation':
      return 'Pendiente de preparación';
    case 'in_preparation':
      return 'En preparación';
    case 'ready_to_ship':
      return 'Listo para despachar';
    case 'dispatched':
      return 'Despachado';
    case 'in_transit':
      return 'En camino';
    case 'delivered':
      return 'Entregado';
    case 'delivery_issue':
      return 'Incidencia de entrega';
    case 'ready_for_pickup':
      return 'Listo para retirar';
    case 'picked_up':
      return 'Retirado';
    default:
      return status;
  }
};

/** Mismo criterio que `logistics-status.helper.ts` del backend - qué subconjunto de estados
 *  aplica según la modalidad de entrega (ver tarea, punto 7). */
export const ALLOWED_LOGISTICS_STATUSES: Record<DeliveryMethod, readonly LogisticsStatus[]> = {
  home_delivery: [
    'pending_preparation',
    'in_preparation',
    'ready_to_ship',
    'dispatched',
    'in_transit',
    'delivered',
    'delivery_issue',
  ],
  pickup: ['pending_preparation', 'in_preparation', 'ready_for_pickup', 'picked_up'],
};
