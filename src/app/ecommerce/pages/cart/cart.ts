import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import type { CartLine as CartLineModel } from '../../../core/cart/cart.model';
import { CartService } from '../../../core/cart/cart.service';
import { formatPrice } from '../../data/format-price';
import { CartLine } from './components/cart-line/cart-line';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, CartLine],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export default class Cart {
  protected readonly cartService = inject(CartService);
  protected readonly authService = inject(AuthService);

  protected readonly checking = signal(false);
  protected readonly checkoutReady = signal(false);
  protected readonly removedLines = signal<readonly CartLineModel[] | null>(null);

  protected readonly subtotalLabel = computed(() => formatPrice(this.cartService.subtotalValue()));

  constructor() {
    // Catches the "haven't opened the cart in a while" case: refresh stock status for every
    // line the moment the page is viewed, independent of whatever was cached in sessionStorage.
    void this.cartService.revalidateStock();
  }

  protected async checkout(): Promise<void> {
    this.checking.set(true);
    this.checkoutReady.set(false);

    const removed = await this.cartService.validateBeforeCheckout();

    this.checking.set(false);

    if (removed.length > 0) {
      this.removedLines.set(removed);
      return;
    }

    this.removedLines.set(null);
    this.checkoutReady.set(true);
  }
}
