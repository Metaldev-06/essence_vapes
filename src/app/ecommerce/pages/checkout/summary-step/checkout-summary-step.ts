import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AddressesService } from '../../../../core/addresses/addresses.service';
import { CartService } from '../../../../core/cart/cart.service';
import type { CreateOrderParams, RemovedCartLine } from '../../../../core/orders/order.model';
import { OrdersService } from '../../../../core/orders/orders.service';
import { buildWhatsAppLink } from '../../../../core/whatsapp/whatsapp-link.helper';
import { LegalInfoService } from '../../../data/legal-info.service';
import { formatPrice } from '../../../data/format-price';
import { CheckoutService } from '../checkout.service';

/** `[COMPLETAR: ...]` es el placeholder del backend (`legal.config.ts`) cuando el titular
 *  todavía no cargó el WhatsApp real - nunca armar un link con eso. */
const isPlaceholder = (value: string): boolean => !value || value.startsWith('[COMPLETAR');

/** Paso 2/4 - revisar carrito + modalidad de entrega y recién ahí crear la orden real (reserva
 *  stock). */
@Component({
  selector: 'app-checkout-summary-step',
  imports: [RouterLink],
  templateUrl: './checkout-summary-step.html',
  styleUrl: './checkout-summary-step.css',
})
export default class CheckoutSummaryStep implements OnInit {
  protected readonly cartService = inject(CartService);
  protected readonly addressesService = inject(AddressesService);
  protected readonly checkoutService = inject(CheckoutService);
  protected readonly ordersService = inject(OrdersService);
  private readonly legalInfoService = inject(LegalInfoService);
  private readonly router = inject(Router);

  protected readonly deliverySelection = this.checkoutService.deliverySelection;

  // Si ya existe una orden para este checkout (se volvió acá desde "Pago", con un error de pago
  // o por "Volver al resumen"), el carrito ya se vació cuando se confirmó la primera vez - este
  // paso pasa a mostrar esa orden ya creada en vez de intentar leer un carrito vacío.
  protected readonly existingOrder = this.ordersService.currentOrder;

  // Envío "a coordinar" sin tarifa definida todavía (ver `OrdersService.createFromCart`
  // backend) - la orden existe pero el backend nunca la deja pagar hasta que se fije el costo.
  // Acá nunca se intenta ir a "Pago": se coordina por WhatsApp primero.
  protected readonly shippingQuotePending = computed(
    () => this.existingOrder()?.shippingCostPending === true,
  );

  protected readonly supportWhatsAppLink = computed(() => {
    const whatsapp = this.legalInfoService.info().whatsapp;
    const order = this.existingOrder();
    if (isPlaceholder(whatsapp) || !order) return null;
    return buildWhatsAppLink(
      whatsapp,
      `Hola! Quiero coordinar el costo de envío de mi pedido #${order.id.slice(0, 8)}.`,
    );
  });

  protected readonly selectedAddress = computed(() => {
    const selection = this.deliverySelection();
    if (selection?.method !== 'home_delivery') return undefined;
    return this.addressesService.addresses().find((a) => a.id === selection.addressId);
  });

  protected readonly totalLabel = computed(() => {
    const order = this.existingOrder();
    return order ? order.total : formatPrice(this.cartService.subtotalValue());
  });

  protected readonly confirming = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly removedNotice = signal<RemovedCartLine[] | null>(null);

  ngOnInit(): void {
    if (!this.checkoutService.deliverySelection() || !this.checkoutService.acceptedTerms()) {
      void this.router.navigateByUrl('/checkout/direccion');
    }
  }

  protected async confirm(): Promise<void> {
    // La orden ya se confirmó antes - solo falta volver a "Pago", nunca recrearla desde el
    // carrito (que a esta altura está vacío a propósito). Si todavía espera que le definan el
    // costo de envío, no hay a dónde "continuar" - el bloque de espera ya se muestra solo.
    const existing = this.existingOrder();
    if (existing) {
      if (!existing.shippingCostPending) void this.router.navigateByUrl('/checkout/pago');
      return;
    }

    const selection = this.checkoutService.deliverySelection();
    if (!selection) return;

    this.confirming.set(true);
    this.error.set(null);

    const params: CreateOrderParams =
      selection.method === 'home_delivery'
        ? { deliveryMethod: 'home_delivery', addressId: selection.addressId, acceptTerms: true }
        : {
            deliveryMethod: 'pickup',
            pickupContactName: selection.pickupContactName,
            pickupPhone: selection.pickupPhone,
            ...(selection.pickupNotes ? { pickupNotes: selection.pickupNotes } : {}),
            acceptTerms: true,
          };

    const result = await this.ordersService.createFromCart(params);

    this.confirming.set(false);

    if (!result.success) {
      this.error.set(result.message);
      return;
    }

    await this.cartService.clear();

    if (result.removedFromCart.length > 0) {
      this.removedNotice.set(result.removedFromCart);
      return;
    }

    // Envío "a coordinar" sin tarifa todavía - el pedido queda registrado pero no se puede pagar
    // hasta coordinar el costo por WhatsApp (ver `shippingQuotePending`, que ya refleja esto
    // porque `result.order` quedó seteado en `OrdersService.currentOrder`).
    if (result.order.shippingCostPending) return;

    void this.router.navigateByUrl('/checkout/pago');
  }

  protected continueAfterNotice(): void {
    void this.router.navigateByUrl('/checkout/pago');
  }
}
