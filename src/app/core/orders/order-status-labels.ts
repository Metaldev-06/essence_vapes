import type { OrderStatus, PaymentStatus } from './order.model';

/** Compartido por "Mis compras" (storefront) y el panel admin "Ventas/Pedidos") - una sola
 *  fuente de las etiquetas en español para los mismos enums que usa el backend. */
export const orderStatusLabel = (status: OrderStatus): string => {
  switch (status) {
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
