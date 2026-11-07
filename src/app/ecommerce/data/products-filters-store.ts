import { Injectable } from '@angular/core';
import type { Gender, ProductCategory, ScentStyle, SortOption } from './product.model';

export interface ProductsFiltersSnapshot {
  readonly term: string;
  readonly category: ProductCategory | 'todos';
  readonly brand: string | 'todas';
  readonly gender: Gender | 'todos';
  readonly sort: SortOption;
  readonly styles: readonly ScentStyle[];
  readonly capacityMl: number | null;
}

export const DEFAULT_PRODUCTS_FILTERS: ProductsFiltersSnapshot = {
  term: '',
  category: 'todos',
  brand: 'todas',
  gender: 'todos',
  sort: 'destacados',
  styles: [],
  capacityMl: null,
};

const STORAGE_KEY = 'ev:products-filters';

/**
 * Persists the /productos filter state in sessionStorage instead of the URL - refreshing the
 * page while still on it keeps whatever was last applied, and this is deliberately NOT synced to
 * query params. The Products page itself clears this on `ngOnDestroy` (leaving the page resets
 * it for next time), and other pages (home's category cards, finder, decants banner) jump
 * straight into a specific combo by calling `write()` with a full snapshot before navigating.
 */
@Injectable({ providedIn: 'root' })
export class ProductsFiltersStore {
  read(): ProductsFiltersSnapshot {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PRODUCTS_FILTERS;
      return { ...DEFAULT_PRODUCTS_FILTERS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_PRODUCTS_FILTERS;
    }
  }

  write(snapshot: ProductsFiltersSnapshot): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* Best-effort - storage may be unavailable (private browsing, quota, etc). */
    }
  }

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Best-effort - storage may be unavailable (private browsing, quota, etc). */
    }
  }
}
