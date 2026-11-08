import { Injectable } from '@angular/core';
import type { ProductCategory } from '../../ecommerce/data/product.model';

export interface AdminProductsFiltersSnapshot {
  readonly search: string;
  readonly category: ProductCategory | 'todos';
}

export const DEFAULT_ADMIN_PRODUCTS_FILTERS: AdminProductsFiltersSnapshot = {
  search: '',
  category: 'todos',
};

const STORAGE_KEY = 'ev:admin-products-filters';

/**
 * Persists the admin /productos list's search + category filter in sessionStorage so a page
 * refresh keeps them - unlike the storefront's ProductsFiltersStore, this one is deliberately
 * NOT cleared on navigating away: the admin asked for the filter to stick until they clear it
 * themselves (the "Limpiar filtros" button), not just across a same-page refresh.
 */
@Injectable({ providedIn: 'root' })
export class AdminProductsFiltersStore {
  read(): AdminProductsFiltersSnapshot {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_ADMIN_PRODUCTS_FILTERS;
      return { ...DEFAULT_ADMIN_PRODUCTS_FILTERS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_ADMIN_PRODUCTS_FILTERS;
    }
  }

  write(snapshot: AdminProductsFiltersSnapshot): void {
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
