import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DEFAULT_PRODUCTS_FILTERS, ProductsFiltersStore } from '../../../../data/products-filters-store';

/** One real product photo per decant size, shown in the visual side - swaps with the size pill. */
const SIZE_PHOTOS: Record<number, string> = {
  2: 'images/decants/2ml.png',
  5: 'images/decants/5ml.png',
  10: 'images/decants/10ml.png',
};

@Component({
  selector: 'app-decants-banner',
  imports: [NgOptimizedImage],
  templateUrl: './decants-banner.html',
  styleUrl: './decants-banner.css',
})
export class DecantsBanner {
  private readonly router = inject(Router);
  private readonly filtersStore = inject(ProductsFiltersStore);

  protected readonly sizes: readonly number[] = [2, 5, 10];

  protected readonly selectedSize = signal(this.sizes[0]);
  protected readonly selectedPhoto = computed(() => SIZE_PHOTOS[this.selectedSize()]);

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
