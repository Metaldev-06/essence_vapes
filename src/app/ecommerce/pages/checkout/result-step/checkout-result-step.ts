import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { OrdersService } from '../../../../core/orders/orders.service';
import { CheckoutService } from '../checkout.service';

type ResultKind = 'approved' | 'pending' | 'rejected' | 'unknown';

/** Paso 4/4 - nunca se llega acá sin haber pasado por `PaymentsService.processPayment`, cuya
 *  respuesta ya refleja el estado real confirmado por el backend contra Mercado Pago (nunca
 *  algo que el propio frontend haya decidido por su cuenta). */
@Component({
  selector: 'app-checkout-result-step',
  imports: [RouterLink],
  templateUrl: './checkout-result-step.html',
  styleUrl: './checkout-result-step.css',
})
export default class CheckoutResultStep {
  protected readonly checkoutService = inject(CheckoutService);
  protected readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);

  protected readonly result = this.checkoutService.lastPaymentResult();
  protected readonly order = this.ordersService.currentOrder();

  protected readonly kind = computed<ResultKind>(() => {
    switch (this.result?.paymentStatus) {
      case 'approved':
        return 'approved';
      case 'pending':
      case 'in_process':
        return 'pending';
      case 'rejected':
        return 'rejected';
      default:
        return 'unknown';
    }
  });

  protected readonly canRetry = computed(
    () => this.kind() === 'rejected' && this.order?.status === 'pending_payment',
  );

  constructor() {
    if (!this.result) {
      void this.router.navigateByUrl('/cuenta/pedidos');
    }
  }

  protected retry(): void {
    void this.router.navigateByUrl('/checkout/pago');
  }
}
