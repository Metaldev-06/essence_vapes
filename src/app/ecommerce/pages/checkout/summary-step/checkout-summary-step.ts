import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AddressesService } from '../../../../core/addresses/addresses.service';
import { CartService } from '../../../../core/cart/cart.service';
import type { CreateOrderParams, RemovedCartLine } from '../../../../core/orders/order.model';
import { OrdersService } from '../../../../core/orders/orders.service';
import { formatPrice } from '../../../data/format-price';
import { CheckoutService } from '../checkout.service';

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
  private readonly router = inject(Router);

  protected readonly deliverySelection = this.checkoutService.deliverySelection;

  // Si ya existe una orden para este checkout (se volvió acá desde "Pago", con un error de pago
  // o por "Volver al resumen"), el carrito ya se vació cuando se confirmó la primera vez - este
  // paso pasa a mostrar esa orden ya creada en vez de intentar leer un carrito vacío.
  protected readonly existingOrder = this.ordersService.currentOrder;

  protected readonly selectedAddress = computed(() => {
    const selection = this.deliverySelection();
    if (selection?.method !== 'home_delivery') return undefined;
    return this.addressesService.addresses().find((a) => a.id === selection.addressId);
  });

  // Siempre el subtotal de productos - lo único que se cobra en este checkout. El costo de
  // envío (cuando corresponda) nunca se suma acá: se coordina y se cobra aparte por WhatsApp.
  protected readonly subtotalLabel = computed(() => {
    const order = this.existingOrder();
    return order ? order.subtotal : formatPrice(this.cartService.subtotalValue());
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
    // carrito (que a esta altura está vacío a propósito).
    const existing = this.existingOrder();
    if (existing) {
      void this.router.navigateByUrl('/checkout/pago');
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

    void this.router.navigateByUrl('/checkout/pago');
  }

  protected continueAfterNotice(): void {
    void this.router.navigateByUrl('/checkout/pago');
  }
}
