import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../../../core/cart/cart.service';
import { ACCENT_VARS } from '../../../../data/accent';
import { formatPrice } from '../../../../data/format-price';
import type { CartLine as CartLineModel } from '../../../../../core/cart/cart.model';

@Component({
  selector: 'app-cart-line',
  imports: [RouterLink],
  templateUrl: './cart-line.html',
  styleUrl: './cart-line.css',
})
export class CartLine {
  private readonly cartService = inject(CartService);

  readonly line = input.required<CartLineModel>();

  protected readonly accentVar = computed(() => ACCENT_VARS[this.line().product.accent]);
  protected readonly subtotal = computed(() =>
    formatPrice(this.line().product.priceValue * this.line().quantity),
  );

  protected readonly canIncrease = computed(
    () => this.line().quantity < this.line().availableStock,
  );
  protected readonly lowStock = computed(() => {
    const line = this.line();
    return line.isValid && line.availableStock - line.quantity <= 2;
  });

  protected decrease(): void {
    const line = this.line();
    void this.cartService.setQuantity(line.product, line.quantity - 1);
  }

  protected increase(): void {
    const line = this.line();
    if (!this.canIncrease()) return;
    void this.cartService.setQuantity(line.product, line.quantity + 1);
  }

  protected remove(): void {
    void this.cartService.remove(this.line().productId);
  }
}
