import { Injectable, signal } from '@angular/core';

import type { ProcessPaymentResponse } from '../../../core/payments/payment.model';

/** Lo elegido en el paso "Entrega" - discriminado por `method` (ver `CreateOrderParams`). */
export type DeliverySelection =
  | { method: 'home_delivery'; addressId: string }
  | { method: 'pickup'; pickupContactName: string; pickupPhone: string; pickupNotes: string };

/**
 * Estado del wizard de checkout (`/checkout/*`) - provisto a nivel de esa ruta (ver
 * `ecommerce.routes.ts`, no `providedIn: 'root'`), así se resetea solo cada vez que se entra de
 * nuevo al flujo en vez de arrastrar datos de una compra anterior. La orden en sí vive en
 * `OrdersService.currentOrder` (ver ese servicio) - acá solo lo que todavía no se mandó al
 * backend (modalidad de entrega elegida, términos) más el último resultado de pago.
 */
@Injectable()
export class CheckoutService {
  private readonly deliverySelectionSignal = signal<DeliverySelection | null>(null);
  private readonly acceptedTermsSignal = signal(false);
  private readonly lastPaymentResultSignal = signal<ProcessPaymentResponse | null>(null);

  readonly deliverySelection = this.deliverySelectionSignal.asReadonly();
  readonly acceptedTerms = this.acceptedTermsSignal.asReadonly();
  readonly lastPaymentResult = this.lastPaymentResultSignal.asReadonly();

  setDeliveryAndTerms(selection: DeliverySelection, acceptedTerms: boolean): void {
    this.deliverySelectionSignal.set(selection);
    this.acceptedTermsSignal.set(acceptedTerms);
  }

  setLastPaymentResult(result: ProcessPaymentResponse | null): void {
    this.lastPaymentResultSignal.set(result);
  }
}
