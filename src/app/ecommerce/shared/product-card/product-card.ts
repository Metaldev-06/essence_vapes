import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/cart/cart.service';
import { CompareService } from '../../../core/compare/compare.service';
import { FavoritesService } from '../../../core/favorites/favorites.service';
import { CATEGORY_SINGULAR_LABELS, type Gender, type Product } from '../../data/product.model';

const GENDER_LABELS: Record<Gender, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  unisex: 'Unisex',
};

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  private readonly favoritesService = inject(FavoritesService);
  private readonly cartService = inject(CartService);
  private readonly compareService = inject(CompareService);

  readonly product = input.required<Product>();
  protected readonly maxCompareItems = this.compareService.maxItems;

  protected readonly categoryLabel = computed(() => CATEGORY_SINGULAR_LABELS[this.product().category]);

  protected readonly genderLabel = computed(() => {
    const gender = this.product().gender;
    return gender ? GENDER_LABELS[gender] : undefined;
  });

  /** First uploaded photo, if any - falls back to the decorative SVG bottle otherwise. */
  protected readonly coverImage = computed(() => this.product().images[0]);

  protected readonly isFavorite = computed(() =>
    this.favoritesService.isFavorite(this.product().id, this.product().variantId),
  );

  protected readonly isComparing = computed(() =>
    this.compareService.isComparing(this.product().id, this.product().variantId),
  );

  /** Disabled only when trying to ADD a new item while already at the comparator's max. */
  protected readonly compareDisabled = computed(
    () => !this.isComparing() && this.compareService.isFull(),
  );

  protected readonly canAddToCart = computed(() => {
    const product = this.product();
    return (
      product.isActive &&
      this.cartService.getQuantity(product.id, product.variantId) < product.stock
    );
  });

  protected toggleFavorite(): void {
    void this.favoritesService.toggle(this.product().id, this.product().variantId);
  }

  protected toggleCompare(): void {
    this.compareService.toggle(this.product().id, this.product().variantId);
  }

  protected addToCart(): void {
    if (!this.canAddToCart()) return;
    void this.cartService.add(this.product(), 1);
  }
}
