import { Component, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductsService } from '../../../../data/products.service';
import type { Product, ProductStyle } from '../../../../data/product.model';
import { ProductCard } from '../../../../shared/product-card/product-card';

/**
 * "Recomendados para vos" - products sharing the user's most-favorited scent styles, excluding
 * anything already favorited. No separate recommendation endpoint: reuses the same public
 * `/products` style filter the catalog page uses.
 */
@Component({
  selector: 'app-favorites-recommendations',
  imports: [RouterLink, ProductCard],
  templateUrl: './favorites-recommendations.html',
  styleUrl: './favorites-recommendations.css',
})
export class FavoritesRecommendations {
  private readonly productsService = inject(ProductsService);

  readonly favorites = input.required<readonly Product[]>();

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  private readonly topStyles = computed<ProductStyle[]>(() => {
    const counts = new Map<ProductStyle, number>();
    for (const product of this.favorites()) {
      for (const style of product.styles) {
        counts.set(style, (counts.get(style) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([style]) => style);
  });

  private readonly favoriteIds = computed(() => new Set(this.favorites().map((product) => product.id)));

  private readonly recommendationsResource = this.productsService.list(() => {
    const styles = this.topStyles();
    if (styles.length === 0) return undefined;
    return { styles: styles.slice(0, 2), limit: 12, sort: 'featured', order: 'desc' };
  });

  protected readonly items = computed<readonly Product[]>(() => {
    const excluded = this.favoriteIds();
    return this.recommendationsResource
      .value()
      .data.filter((product) => !excluded.has(product.id))
      .slice(0, 8);
  });

  protected scroll(direction: -1 | 1): void {
    const element = this.track()?.nativeElement;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.9, behavior: 'smooth' });
  }
}
