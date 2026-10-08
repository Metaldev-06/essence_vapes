import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { FavoritesService } from '../../../../../core/favorites/favorites.service';
import { ACCENT_VARS } from '../../../../data/accent';
import type { Product } from '../../../../data/product.model';

@Component({
  selector: 'app-product-gallery',
  imports: [NgOptimizedImage],
  templateUrl: './product-gallery.html',
  styleUrl: './product-gallery.css',
})
export class ProductGallery {
  private readonly favoritesService = inject(FavoritesService);

  readonly product = input.required<Product>();

  protected readonly accentVar = computed(() => ACCENT_VARS[this.product().accent]);

  /** First uploaded photo, if any - falls back to the decorative SVG bottle otherwise. */
  protected readonly coverImage = computed(() => this.product().images[0]);

  protected readonly isFavorite = computed(() =>
    this.favoritesService.isFavorite(this.product().id),
  );

  protected toggleFavorite(): void {
    void this.favoritesService.toggle(this.product().id);
  }
}
