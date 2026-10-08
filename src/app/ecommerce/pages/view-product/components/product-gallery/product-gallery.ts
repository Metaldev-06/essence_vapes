import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, input, linkedSignal } from '@angular/core';
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

  protected readonly isFavorite = computed(() =>
    this.favoritesService.isFavorite(this.product().id),
  );

  /** Resets to the first photo whenever the product changes (e.g. navigating via "related products"). */
  protected readonly activeImageIndex = linkedSignal(() => {
    this.product();
    return 0;
  });

  /** Currently shown photo, if the product has any - falls back to the decorative SVG bottle otherwise. */
  protected readonly activeImage = computed(() => this.product().images[this.activeImageIndex()]);

  protected toggleFavorite(): void {
    void this.favoritesService.toggle(this.product().id);
  }

  protected selectImage(index: number): void {
    this.activeImageIndex.set(index);
  }
}
