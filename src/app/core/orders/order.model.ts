export type OrderStatus =
  | 'pending_payment'
  | 'processing'
  | 'paid'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'in_process'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

export type DeliveryMethod = 'home_delivery' | 'pickup';

export type ShippingCostMode = 'free' | 'fixed' | 'by_province' | 'to_coordinate';

export type LogisticsStatus =
  | 'pending_preparation'
  | 'in_preparation'
  | 'ready_to_ship'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'delivery_issue'
  | 'ready_for_pickup'
  | 'picked_up';

export interface OrderShippingAddress {
  recipientName: string;
  phone: string;
  street: string;
  streetNumber: string;
  apartment?: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  betweenStreets?: string | null;
  notes?: string | null;
}

export interface OrderPickupDetails {
  contactName: string;
  phone: string;
  notes?: string | null;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string | null;
  unitPriceValue: number;
  unitPrice: string;
  quantity: number;
  lineTotalValue: number;
  lineTotal: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalValue: number;
  subtotal: string;
  totalValue: number;
  total: string;
  currency: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  deliveryMethod: DeliveryMethod;
  shippingAddress?: OrderShippingAddress;
  pickupDetails?: OrderPickupDetails;
  logisticsStatus: LogisticsStatus;
  logisticsCompletedAt?: string;
  shippingCostMode?: ShippingCostMode;
  shippingCostValue?: number;
  shippingCost?: string;
  /** `true` = todavía no hay tarifa de envío sugerida - solo informativo, nunca bloquea el pago
   *  (el envío se coordina y se cobra aparte por WhatsApp después de pagar el subtotal). */
  shippingCostPending: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  /** Nota interna del admin (ver tarea, punto 7.4) - solo presente en respuestas admin, nunca en
   *  "Mis compras" del comprador. */
  internalNotes?: string | null;
}

/** Body de `POST /orders` - discriminado por `deliveryMethod` (ver `CreateOrderDto` backend). */
export type CreateOrderParams =
  | { deliveryMethod: 'home_delivery'; addressId: string; acceptTerms: boolean }
  | {
      deliveryMethod: 'pickup';
      pickupContactName: string;
      pickupPhone: string;
      pickupNotes?: string;
      acceptTerms: boolean;
    };

/** Línea de carrito quitada al crear la orden (ya no tenía stock suficiente) - mismo shape que
 *  devuelve `CartService.validate` en el backend. */
export interface RemovedCartLine {
  productId: string;
  variantId: string;
  product: { name: string; brand: string } | null;
}

export interface CreateOrderResult {
  order: Order;
  removedFromCart: RemovedCartLine[];
}

export interface PaginatedOrders {
  data: Order[];
  pagination: { total: number; pages: number; current: number; limit: number; offset: number };
}
