import { Injectable, signal } from '@angular/core';

import type { ProcessPaymentResponse } from '../../../core/payments/payment.model';

/**
 * Estado del wizard de checkout (`/checkout/*`) - provisto a nivel de esa ruta (ver
 * `ecommerce.routes.ts`, no `providedIn: 'root'`), así se resetea solo cada vez que se entra de
 * nuevo al flujo en vez de arrastrar datos de una compra anterior. La orden en sí vive en
 * `OrdersService.currentOrder` (ver ese servicio) - acá solo lo que todavía no se mandó al
 * backend (dirección elegida, términos) más el último resultado de pago.
 */
@Injectable()
export class CheckoutService {
  private readonly selectedAddressIdSignal = signal<string | null>(null);
  private readonly acceptedTermsSignal = signal(false);
  private readonly lastPaymentResultSignal = signal<ProcessPaymentResponse | null>(null);

  readonly selectedAddressId = this.selectedAddressIdSignal.asReadonly();
  readonly acceptedTerms = this.acceptedTermsSignal.asReadonly();
  readonly lastPaymentResult = this.lastPaymentResultSignal.asReadonly();

  setAddressAndTerms(addressId: string, acceptedTerms: boolean): void {
    this.selectedAddressIdSignal.set(addressId);
    this.acceptedTermsSignal.set(acceptedTerms);
  }

  setLastPaymentResult(result: ProcessPaymentResponse | null): void {
    this.lastPaymentResultSignal.set(result);
  }
}
