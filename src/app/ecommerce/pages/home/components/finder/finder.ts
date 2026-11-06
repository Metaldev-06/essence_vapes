import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SCENT_STYLE_OPTIONS } from '../../../../data/scent-styles';
import { DEFAULT_PRODUCTS_FILTERS, ProductsFiltersStore } from '../../../../data/products-filters-store';
import type { ScentStyle } from '../../../../data/product.model';

@Component({
  selector: 'app-finder',
  imports: [],
  templateUrl: './finder.html',
  styleUrl: './finder.css',
})
export class Finder {
  private readonly router = inject(Router);
  private readonly filtersStore = inject(ProductsFiltersStore);

  protected readonly styles = SCENT_STYLE_OPTIONS;

  protected readonly selected = signal<ReadonlySet<ScentStyle>>(new Set());

  protected readonly selectedCount = computed(() => this.selected().size);

  protected isSelected(id: ScentStyle): boolean {
    return this.selected().has(id);
  }

  protected toggle(id: ScentStyle): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /**
   * Jumps straight into Productos filtered to the chosen styles - written to sessionStorage
   * (see `ProductsFiltersStore`), never as a query param in the URL.
   */
  protected goToRecommendations(): void {
    if (this.selected().size === 0) return;
    this.filtersStore.write({
      ...DEFAULT_PRODUCTS_FILTERS,
      styles: Array.from(this.selected()),
    });
    void this.router.navigateByUrl('/productos');
  }
}
