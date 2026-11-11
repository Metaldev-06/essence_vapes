import type { OrderStatus, PaymentStatus } from '../orders/order.model';

export interface ProcessPaymentInput {
  orderId: string;
  token: string;
  paymentMethodId: string;
  paymentMethodType: 'credit_card' | 'debit_card';
  issuerId?: string;
  installments: number;
  payer: { email?: string; identification?: { type: string; number: string } };
}

export interface ProcessPaymentResponse {
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  statusDetail?: string;
}

export type ProcessPaymentResult =
  | { success: true; response: ProcessPaymentResponse }
  | { success: false; message: string };
