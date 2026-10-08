import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../../core/favorites/favorites.service';
import { FAVORITE_FILTER_CARDS } from '../../data/favorite-filters';
import { ProductCard } from '../../shared/product-card/product-card';
import { FavoritesFilters } from './components/favorites-filters/favorites-filters';
import { TasteProfile } from './components/taste-profile/taste-profile';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink, ProductCard, TasteProfile, FavoritesFilters],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export default class Favorites {
  protected readonly favoritesService = inject(FavoritesService);

  protected readonly activeFilters = signal<ReadonlySet<string>>(new Set());

  protected readonly hasAnyFavorites = computed(() => this.favoritesService.products().length > 0);
  protected readonly hasActiveFilters = computed(() => this.activeFilters().size > 0);

  protected readonly filteredProducts = computed(() => {
    const active = this.activeFilters();
    const products = this.favoritesService.products();
    if (active.size === 0) return products;

    const cardsById = new Map(FAVORITE_FILTER_CARDS.map((card) => [card.id, card]));
    return products.filter((product) =>
      [...active].every((id) => cardsById.get(id)?.matches(product) ?? true),
    );
  });

  protected clearFilters(): void {
    this.activeFilters.set(new Set());
  }
}
