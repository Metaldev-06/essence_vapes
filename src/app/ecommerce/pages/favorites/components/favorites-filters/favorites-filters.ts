import { Component, computed, input, model } from '@angular/core';
import {
  FAVORITE_FILTER_CARDS,
  FAVORITE_FILTER_GROUP_LABELS,
  type FavoriteFilterGroup,
} from '../../../../data/favorite-filters';
import type { Product } from '../../../../data/product.model';

interface FilterGroupView {
  readonly group: FavoriteFilterGroup;
  readonly label: string;
  readonly cards: readonly {
    readonly id: string;
    readonly emoji: string;
    readonly label: string;
    readonly count: number;
  }[];
}

@Component({
  selector: 'app-favorites-filters',
  imports: [],
  templateUrl: './favorites-filters.html',
  styleUrl: './favorites-filters.css',
})
export class FavoritesFilters {
  readonly products = input.required<readonly Product[]>();
  readonly activeFilters = model<ReadonlySet<string>>(new Set());

  protected readonly groups = computed<readonly FilterGroupView[]>(() => {
    const products = this.products();

    const byGroup = new Map<FavoriteFilterGroup, FilterGroupView['cards'][number][]>();
    for (const card of FAVORITE_FILTER_CARDS) {
      const count = products.reduce(
        (total, product) => (card.matches(product) ? total + 1 : total),
        0,
      );
      const cards = byGroup.get(card.group) ?? [];
      cards.push({ id: card.id, emoji: card.emoji, label: card.label, count });
      byGroup.set(card.group, cards);
    }

    return (Object.keys(FAVORITE_FILTER_GROUP_LABELS) as FavoriteFilterGroup[]).map((group) => ({
      group,
      label: FAVORITE_FILTER_GROUP_LABELS[group],
      cards: byGroup.get(group) ?? [],
    }));
  });

  protected readonly hasActiveFilters = computed(() => this.activeFilters().size > 0);

  protected toggle(id: string): void {
    this.activeFilters.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected clear(): void {
    this.activeFilters.set(new Set());
  }
}
