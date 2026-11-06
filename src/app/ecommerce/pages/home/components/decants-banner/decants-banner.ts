import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DEFAULT_PRODUCTS_FILTERS, ProductsFiltersStore } from '../../../../data/products-filters-store';

@Component({
  selector: 'app-decants-banner',
  imports: [],
  templateUrl: './decants-banner.html',
  styleUrl: './decants-banner.css',
})
export class DecantsBanner {
  private readonly router = inject(Router);
  private readonly filtersStore = inject(ProductsFiltersStore);

  protected readonly sizes: readonly number[] = [2, 5, 10];

  protected readonly selectedSize = signal(this.sizes[0]);

  protected selectSize(ml: number): void {
    this.selectedSize.set(ml);
  }

  /**
   * Jumps straight into Productos filtered to decants + the chosen size - written to
   * sessionStorage (see `ProductsFiltersStore`), never as a query param in the URL.
   */
  protected goToDecants(): void {
    this.filtersStore.write({
      ...DEFAULT_PRODUCTS_FILTERS,
      category: 'decants',
      capacityMl: this.selectedSize(),
    });
    void this.router.navigateByUrl('/productos');
  }
}
