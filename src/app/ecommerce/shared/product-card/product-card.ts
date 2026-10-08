import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
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

  readonly product = input.required<Product>();

  protected readonly accentVar = computed(() => ACCENT_VARS[this.product().accent]);

  protected readonly isFavorite = computed(() =>
    this.favoritesService.isFavorite(this.product().id),
  );

  protected toggleFavorite(): void {
    void this.favoritesService.toggle(this.product().id);
  }
}
