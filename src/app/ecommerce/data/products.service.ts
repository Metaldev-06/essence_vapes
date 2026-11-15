import { Injectable, Signal, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { type Observable, catchError, shareReplay } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';
import type { Gender, Product, ProductCategory, ProductStyle } from './product.model';

export type ProductsSortField =
  'name' | 'brand' | 'priceValue' | 'rating' | 'year' | 'createdAt' | 'featured';

export interface ProductsQuery {
  readonly term?: string;
  readonly category?: ProductCategory;
  readonly brand?: string;
  readonly gender?: Gender;
  readonly styles?: readonly ProductStyle[];
  readonly capacityMl?: readonly number[];
  readonly sort?: ProductsSortField;
  readonly order?: 'asc' | 'desc';
  readonly limit?: number;
  readonly offset?: number;
}

export interface ProductsPagination {
  readonly total: number;
  readonly pages: number;
  readonly current: number;
  readonly limit: number;
  readonly offset: number;
}

export interface ProductsPage {
  readonly data: Product[];
  readonly pagination: ProductsPagination;
}

const EMPTY_PAGE: ProductsPage = {
  data: [],
  pagination: { total: 0, pages: 0, current: 1, limit: 0, offset: 0 },
};

export const PRODUCTS_PAGE_SIZE = 12;

/** Cuánto sirve una ficha precargada al pasar el mouse: cubre de sobra el tiempo hasta el clic.
 *  Pasado eso se vuelve a pedir. */
export const PRODUCT_PREFETCH_TTL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/products`;

  /**
   * Productos destacados (home) - perezoso por el mismo motivo que `capacities()`/`brands()`
   * abajo: `ProductsService` es un singleton inyectado desde lugares que no muestran destacados
   * (el header, para el prefetch-on-hover de "Productos"; `ProductCard` en cualquier página, para
   * `prefetchProduct()`). Como campo de clase `httpResource` eager, esto estaba disparando
   * `/products/featured` en TODAS las páginas del sitio (confirmado en la auditoría de
   * performance, 2026-11-11 - ver `03-http-requests.md` §5.2), incluidas login/registro/favoritos
   * que nunca lo necesitan. Solo `FeaturedProducts` (home) debe llamar a este método.
   */
  featured() {
    return httpResource<Product[]>(() => `${this.baseUrl}/featured`, { defaultValue: [] });
  }

  /**
   * Distinct capacities currently in the catalog (ml or puffs depending on `category` - see
   * `/productos`'s `capacityUnitFor`) - only the `/productos` filters need this, so it's a lazy
   * resource (like `list`/`byId` below) instead of an eager class field: `ProductsService` is a
   * root singleton injected from several unrelated places (e.g. the home page, for `.featured`
   * alone), and an eager `httpResource` field fires its request the moment the service is first
   * constructed, regardless of whether anything ever reads it - that was firing a
   * `/products/capacities` + `/products/brands` request on every page load, home included.
   *
   * `category` is an optional reactive accessor (same shape as `list()`'s `query`) so the
   * resource re-fetches when the storefront's chosen category changes - each category has its
   * own real range of sizes (ver tarea del usuario: no tiene sentido mezclar ml de perfumes con
   * ml de decants, y vapes se mide en puffs, no en ml). Omitted entirely for callers that want
   * the historical unscoped behaviour (e.g. admin reports' brand list).
   */
  capacities(category?: () => ProductCategory | undefined) {
    return httpResource<number[]>(
      () => {
        const cat = category?.();
        // Pasado un accessor, "sin categoría" (ej. "todos") no tiene una unidad única que
        // mostrar (ml vs. puffs) - se salta el pedido entero en vez de traer una lista mezclada.
        if (category && !cat) return undefined;
        return { url: `${this.baseUrl}/capacities`, params: this.categoryParam(cat) };
      },
      { defaultValue: [] },
    );
  }

  /** Distinct brand names currently in the catalog, sorted alphabetically - same reasoning and
   *  `category` shape as `capacities()`. */
  brands(category?: () => ProductCategory | undefined) {
    return httpResource<string[]>(
      () => ({ url: `${this.baseUrl}/brands`, params: this.categoryParam(category?.()) }),
      { defaultValue: [] },
    );
  }

  private categoryParam(category: ProductCategory | undefined): Record<string, string> {
    return category ? { category } : {};
  }

  list(query: () => ProductsQuery | undefined) {
    return httpResource<ProductsPage>(
      () => {
        const value = query();
        if (!value) return undefined;
        return { url: this.baseUrl, params: this.toParams(value) };
      },
      { defaultValue: EMPTY_PAGE },
    );
  }

  /**
   * La ficha de un producto. Si la card del catálogo ya lo precargó (`prefetchProduct`), usa ESA
   * respuesta en vez de pedirlo de nuevo. `rxResource` cancela el pedido anterior si cambia el
   * producto (ej. navegar a uno relacionado).
   */
  byId(id: Signal<string>) {
    return rxResource({
      params: () => id() || undefined,
      stream: ({ params }) => this.takePrefetched(params) ?? this.fetchProduct(params),
    });
  }

  /** Precargas hechas al pasar el mouse por una card, a la espera del clic. */
  private readonly prefetchedProducts = new Map<string, { at: number; response: Observable<Product> }>();

  /**
   * Hover/focus sobre una card: pide el producto ya, y la ficha usa esta misma respuesta.
   *
   * Antes hacía un `http.get` suelto y descartaba el resultado, contando con la caché del
   * navegador - pero la API no manda `Cache-Control` (solo `ETag`), así que al entrar a la ficha
   * el navegador volvía a consultar al servidor (304) y la precarga no ahorraba nada: era un
   * pedido de más.
   */
  prefetchProduct(id: string): void {
    const now = Date.now();
    for (const [key, entry] of this.prefetchedProducts) {
      if (now - entry.at >= PRODUCT_PREFETCH_TTL_MS) this.prefetchedProducts.delete(key);
    }
    if (this.prefetchedProducts.has(id)) return;

    const response = this.fetchProduct(id).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    // Arranca el pedido ya; si falla, no queda guardado y la ficha lo pide de nuevo.
    response.subscribe({ error: () => this.prefetchedProducts.delete(id) });
    this.prefetchedProducts.set(id, { at: now, response });
  }

  /**
   * De un solo uso y con vencimiento: la próxima visita a la ficha trae datos frescos (el stock y
   * el precio pueden cambiar). Si la precarga falló, se pide de nuevo en vez de mostrar el error.
   */
  private takePrefetched(id: string): Observable<Product> | undefined {
    const entry = this.prefetchedProducts.get(id);
    this.prefetchedProducts.delete(id);
    if (!entry || Date.now() - entry.at >= PRODUCT_PREFETCH_TTL_MS) return undefined;
    return entry.response.pipe(catchError(() => this.fetchProduct(id)));
  }

  private fetchProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  private toParams(query: ProductsQuery): Record<string, string | number> {
    const params: Record<string, string | number> = {
      limit: query.limit ?? PRODUCTS_PAGE_SIZE,
      offset: query.offset ?? 0,
    };
    if (query.term) params['term'] = query.term;
    if (query.category) params['category'] = query.category;
    if (query.brand) params['brand'] = query.brand;
    if (query.gender) params['gender'] = query.gender;
    if (query.styles && query.styles.length > 0) params['styles'] = query.styles.join(',');
    if (query.capacityMl && query.capacityMl.length > 0)
      params['capacityMl'] = query.capacityMl.join(',');
    if (query.sort) params['sort'] = query.sort;
    if (query.order) params['order'] = query.order;
    return params;
  }
}
