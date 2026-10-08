import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/cart/cart.service';
import { FavoritesService } from '../../../core/favorites/favorites.service';
import { ACCENT_VARS } from '../../data/accent';
import type { Product } from '../../data/product.model';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  private readonly favoritesService = inject(FavoritesService);
  private readonly cartService = inject(CartService);

  readonly product = input.required<Product>();

  protected readonly accentVar = computed(() => ACCENT_VARS[this.product().accent]);

  protected readonly isFavorite = computed(() =>
    this.favoritesService.isFavorite(this.product().id),
  );

  protected readonly canAddToCart = computed(() => {
    const product = this.product();
    return product.isActive && this.cartService.getQuantity(product.id) < product.stock;
  });

  protected toggleFavorite(): void {
    void this.favoritesService.toggle(this.product().id);
  }

  protected addToCart(): void {
    if (!this.canAddToCart()) return;
    void this.cartService.add(this.product(), 1);
  }
}
