import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { Gender, ProductCategory, ProductStyle, SortOption } from './product.model';

export interface ProductsFiltersSnapshot {
  readonly term: string;
  readonly category: ProductCategory | 'todos';
  readonly brand: string | 'todas';
  readonly gender: Gender | 'todos';
  readonly sort: SortOption;
  readonly styles: readonly ProductStyle[];
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

/** `/productos` o la vista de un producto (`/productos/<id>`), con o sin query params. */
export function isCatalogUrl(url: string): boolean {
  return /^\/productos(?:[/?#]|$)/.test(url);
}

/** La vista de un producto: `/productos/<id>`. */
export function isProductDetailUrl(url: string): boolean {
  return /^\/productos\/[^/?#]+/.test(url);
}

/**
 * Persists the /productos filter state in sessionStorage instead of the URL - refreshing the
 * page while still on it keeps whatever was last applied, and this is deliberately NOT synced to
 * query params. Other pages (home's category cards, finder, decants banner) jump straight into a
 * specific combo by calling `write()` with a full snapshot before navigating.
 *
 * Cuándo se reinician: mientras la persona se mueve entre el catálogo y la vista de productos,
 * los filtros se conservan (entrar a un perfume y volver atrás muestra lo mismo); al salir a
 * cualquier otra sección, se borran. Cada página avisa al cerrarse (`leaveCatalog` /
 * `leaveProductView`) y acá se decide según a dónde va la navegación en curso.
 */
@Injectable({ providedIn: 'root' })
export class ProductsFiltersStore {
  private readonly router = inject(Router);

  /** /productos se cierra: los filtros quedan solo si se va a ver un producto. */
  leaveCatalog(): void {
    const target = this.navigationTarget();
    if (target === null || !isProductDetailUrl(target)) this.clear();
  }

  /** La vista de un producto se cierra: si no se vuelve al catálogo, lo guardado para la vuelta
   *  ya no corresponde. */
  leaveProductView(): void {
    const target = this.navigationTarget();
    if (target === null || !isCatalogUrl(target)) this.clear();
  }

  /** URL a la que va la navegación en curso; `null` si la página se cierra por otro motivo. */
  private navigationTarget(): string | null {
    const navigation = this.router.currentNavigation();
    const tree = navigation?.finalUrl ?? navigation?.extractedUrl;
    return tree ? this.router.serializeUrl(tree) : null;
  }

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
