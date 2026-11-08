import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { FavoritesService } from '../../../core/favorites/favorites.service';
import { FAVORITE_FILTER_CARDS } from '../../data/favorite-filters';
import { SCENT_STYLE_OPTIONS } from '../../data/scent-styles';
import type { ScentStyle } from '../../data/product.model';
import { ProductCard } from '../../shared/product-card/product-card';
import { FavoritesFilters } from './components/favorites-filters/favorites-filters';
import { TasteProfile } from './components/taste-profile/taste-profile';
import { FavoritesInsights } from './components/favorites-insights/favorites-insights';
import { FavoritesRecommendations } from './components/favorites-recommendations/favorites-recommendations';

type SortOption = 'reciente' | 'precio-asc' | 'precio-desc' | 'nombre';
type ViewMode = 'grid' | 'list';

const STYLE_LABELS: Record<ScentStyle, string> = Object.fromEntries(
  SCENT_STYLE_OPTIONS.map((option) => [option.id, option.label]),
) as Record<ScentStyle, string>;

@Component({
  selector: 'app-favorites',
  imports: [
    RouterLink,
    ProductCard,
    TasteProfile,
    FavoritesInsights,
    FavoritesFilters,
    FavoritesRecommendations,
  ],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export default class Favorites {
  protected readonly favoritesService = inject(FavoritesService);
  private readonly authService = inject(AuthService);

  protected readonly activeFilters = signal<ReadonlySet<string>>(new Set());
  protected readonly sortBy = signal<SortOption>('reciente');
  protected readonly viewMode = signal<ViewMode>('grid');

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

  protected readonly sortedProducts = computed(() => {
    const products = [...this.filteredProducts()];
    switch (this.sortBy()) {
      case 'precio-asc':
        return products.sort((a, b) => a.priceValue - b.priceValue);
      case 'precio-desc':
        return products.sort((a, b) => b.priceValue - a.priceValue);
      case 'nombre':
        return products.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      default:
        // `favoritesService.products()` is already most-recently-favorited-first.
        return products;
    }
  });

  /** The 4 stat chips under the hero title - a quick read of the taste profile below. */
  protected readonly profileSummary = computed(() => {
    const products = this.favoritesService.products();
    if (products.length === 0) return null;

    const accordCounts = new Map<string, number>();
    const styleCounts = new Map<ScentStyle, number>();
    for (const product of products) {
      for (const accord of product.accords ?? []) {
        accordCounts.set(accord, (accordCounts.get(accord) ?? 0) + 1);
      }
      for (const style of product.styles) {
        styleCounts.set(style, (styleCounts.get(style) ?? 0) + 1);
      }
    }

    const topAccords = [...accordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label]) => label);

    const topStyles = [...styleCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => STYLE_LABELS[id]);

    const topOccasions = FAVORITE_FILTER_CARDS.filter((card) => card.group === 'ocasion')
      .map((card) => ({
        label: card.label,
        count: products.reduce((total, product) => (card.matches(product) ? total + 1 : total), 0),
      }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 2)
      .map((entry) => entry.label);

    return {
      initial: (this.authService.user()?.fullName.trim().charAt(0) || '?').toUpperCase(),
      favoritesCount: products.length,
      topAccordsText: topAccords.join(' · ') || 'Agregá más favoritos',
      topStylesText: topStyles.join(' · ') || 'Agregá más favoritos',
      topOccasionsText: topOccasions.join(' · ') || 'Agregá más favoritos',
    };
  });

  protected clearFilters(): void {
    this.activeFilters.set(new Set());
  }

  protected setSortBy(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value as SortOption);
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }
}
