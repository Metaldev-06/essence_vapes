import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
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
 * Click con Ctrl/Cmd/Shift/Alt o con un botón que no es el izquierdo: el navegador abre el link
 * en otra pestaña o ventana, así que no hay que tocar los filtros de ESTA pestaña.
 */
export function isModifiedClick(event: MouseEvent): boolean {
  return event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
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
  private readonly appliedSubject = new Subject<ProductsFiltersSnapshot>();

  /**
   * Filtros elegidos desde fuera del catálogo (footer, miga de pan de la ficha). Si `/productos`
   * ya está abierto, el link no navega (es la misma URL) y la página no se vuelve a crear: se
   * entera por acá y los aplica en el momento. Sin replay: solo cambios nuevos.
   */
  readonly applied$ = this.appliedSubject.asObservable();

  /** Abre el catálogo con estos filtros: quedan guardados para cuando la página se cree y, si ya
   *  está abierta, se le avisa. */
  apply(snapshot: ProductsFiltersSnapshot): void {
    this.write(snapshot);
    this.appliedSubject.next(snapshot);
  }

  /** El catálogo de una sola categoría, con el resto de los filtros en su valor inicial. */
  showCategory(category: ProductCategory): void {
    this.apply({ ...DEFAULT_PRODUCTS_FILTERS, category });
  }

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
