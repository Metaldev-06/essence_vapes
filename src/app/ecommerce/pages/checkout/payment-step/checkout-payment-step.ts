import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import {
  MercadoPagoSdkService,
  type PaymentBrickController,
} from '../../../../core/payments/mercadopago-sdk.service';
import { PaymentsService } from '../../../../core/payments/payments.service';
import { OrdersService } from '../../../../core/orders/orders.service';
import { CheckoutService } from '../checkout.service';

const BRICK_CONTAINER_ID = 'checkout-payment-brick-container';

/** Paso 3/4 - Payment Brick. La orden ya existe (creada en el paso "resumen") y ya reservó el
 *  stock; este paso solo intenta cobrarla, con reintento seguro si Mercado Pago la rechaza. */
@Component({
  selector: 'app-checkout-payment-step',
  imports: [RouterLink],
  templateUrl: './checkout-payment-step.html',
  styleUrl: './checkout-payment-step.css',
})
export default class CheckoutPaymentStep implements OnInit, OnDestroy {
  private readonly mercadoPagoSdk = inject(MercadoPagoSdkService);
  private readonly paymentsService = inject(PaymentsService);
  private readonly ordersService = inject(OrdersService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly router = inject(Router);

  protected readonly containerId = BRICK_CONTAINER_ID;
  protected readonly loadingBrick = signal(true);
  protected readonly brickError = signal<string | null>(null);
  protected readonly notConfigured = !environment.mercadoPagoPublicKey;

  private brickController: PaymentBrickController | null = null;

  async ngOnInit(): Promise<void> {
    const order = this.ordersService.currentOrder();
    if (!order) {
      void this.router.navigateByUrl('/checkout/resumen');
      return;
    }
    if (this.notConfigured) {
      this.loadingBrick.set(false);
      return;
    }

    try {
      const mp = await this.mercadoPagoSdk.createInstance(environment.mercadoPagoPublicKey);
      this.brickController = await mp.bricks().create('payment', BRICK_CONTAINER_ID, {
        initialization: { amount: order.totalValue, payer: { email: order.buyerEmail } },
        // Alcance de esta integración: solo tarjetas (ver backend `ProcessPaymentDto`) - omitir
        // `ticket`/`mercadoPago`/`bankTransfer` del objeto los excluye del Brick (ver docs
        // "Administrar medios de pago").
        customization: { paymentMethods: { creditCard: 'all', debitCard: 'all' } },
        callbacks: {
          onReady: () => this.loadingBrick.set(false),
          onError: (error) => {
            this.brickError.set('Ocurrió un error cargando el formulario de pago.');
            // eslint-disable-next-line no-console
            console.error('Payment Brick error', error);
          },
          onSubmit: ({ selectedPaymentMethod, formData }) =>
            this.submitPayment(order.id, selectedPaymentMethod, formData),
        },
      });
    } catch {
      this.loadingBrick.set(false);
      this.brickError.set('No pudimos cargar el formulario de pago. Probá de nuevo en unos segundos.');
    }
  }

  ngOnDestroy(): void {
    // Obligatorio por la propia documentación del Brick: no reusar una instancia montada al
    // salir de esta pantalla.
    this.brickController?.unmount();
  }

  private async submitPayment(
    orderId: string,
    selectedPaymentMethod: string,
    formData: {
      token: string;
      payment_method_id: string;
      issuer_id?: string;
      installments: number;
      payer?: { email?: string; identification?: { type: string; number: string } };
    },
  ): Promise<void> {
    if (selectedPaymentMethod !== 'credit_card' && selectedPaymentMethod !== 'debit_card') {
      this.brickError.set('Ese medio de pago todavía no está disponible - elegí tarjeta.');
      throw new Error('unsupported payment method');
    }

    const result = await this.paymentsService.processPayment({
      orderId,
      token: formData.token,
      paymentMethodId: formData.payment_method_id,
      paymentMethodType: selectedPaymentMethod,
      issuerId: formData.issuer_id,
      installments: formData.installments,
      payer: formData.payer ?? {},
    });

    if (!result.success) {
      this.brickError.set(result.message);
      throw new Error(result.message);
    }

    this.checkoutService.setLastPaymentResult(result.response);
    void this.ordersService.refreshCurrentOrder();
    void this.router.navigateByUrl('/checkout/resultado');
  }
}
