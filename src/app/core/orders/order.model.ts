export type OrderStatus = 'pending_payment' | 'processing' | 'paid' | 'cancelled' | 'expired' | 'refunded';

export type PaymentStatus =
  | 'pending'
  | 'in_process'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

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
  shippingAddress: OrderShippingAddress;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

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
