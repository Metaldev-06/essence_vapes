import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AddressesService } from '../../../../core/addresses/addresses.service';
import { CartService } from '../../../../core/cart/cart.service';
import type { RemovedCartLine } from '../../../../core/orders/order.model';
import { OrdersService } from '../../../../core/orders/orders.service';
import { formatPrice } from '../../../data/format-price';
import { CheckoutService } from '../checkout.service';

/** Paso 2/4 - revisar carrito + dirección y recién ahí crear la orden real (reserva stock). */
@Component({
  selector: 'app-checkout-summary-step',
  imports: [RouterLink],
  templateUrl: './checkout-summary-step.html',
  styleUrl: './checkout-summary-step.css',
})
export default class CheckoutSummaryStep implements OnInit {
  protected readonly cartService = inject(CartService);
  protected readonly addressesService = inject(AddressesService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);

  protected readonly selectedAddress = computed(() =>
    this.addressesService.addresses().find((a) => a.id === this.checkoutService.selectedAddressId()),
  );
  protected readonly subtotalLabel = computed(() => formatPrice(this.cartService.subtotalValue()));

  protected readonly confirming = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly removedNotice = signal<RemovedCartLine[] | null>(null);

  ngOnInit(): void {
    if (!this.checkoutService.selectedAddressId() || !this.checkoutService.acceptedTerms()) {
      void this.router.navigateByUrl('/checkout/direccion');
    }
  }

  protected async confirm(): Promise<void> {
    const addressId = this.checkoutService.selectedAddressId();
    if (!addressId) return;

    this.confirming.set(true);
    this.error.set(null);

    const result = await this.ordersService.createFromCart(addressId, true);

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
