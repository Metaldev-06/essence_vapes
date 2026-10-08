import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/cart/cart.service';
import { FavoritesService } from '../../../core/favorites/favorites.service';
import { ACCENT_VARS } from '../../data/accent';
import type { Product } from '../../data/product.model';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  private readonly favoritesService = inject(FavoritesService);
  private readonly cartService = inject(CartService);

  readonly product = input.required<Product>();

  protected readonly accentVar = computed(() => ACCENT_VARS[this.product().accent]);

  /** First uploaded photo, if any - falls back to the decorative SVG bottle otherwise. */
  protected readonly coverImage = computed(() => this.product().images[0]);

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
