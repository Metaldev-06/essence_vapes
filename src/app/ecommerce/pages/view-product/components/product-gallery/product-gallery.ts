import { Component, computed, inject, input } from '@angular/core';
import { FavoritesService } from '../../../../../core/favorites/favorites.service';
import { ACCENT_VARS } from '../../../../data/accent';
import type { Product } from '../../../../data/product.model';

@Component({
  selector: 'app-product-gallery',
  imports: [],
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

  protected toggleFavorite(): void {
    void this.favoritesService.toggle(this.product().id);
  }
}
