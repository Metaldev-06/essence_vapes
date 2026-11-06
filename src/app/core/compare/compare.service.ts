import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { flattenToVariant } from '../../ecommerce/data/flatten-variant';
import { BASE_VARIANT_ID, type Product } from '../../ecommerce/data/product.model';

export interface CompareKey {
  readonly productId: string;
  readonly variantId: string;
}

const STORAGE_KEY = 'ev:compare';
const MAX_COMPARE_ITEMS = 4;

/**
 * Lets a shopper build up a list of product variants to compare side by side (stats + notes),
 * without needing an account - guests can use it too. State lives only in sessionStorage (no
 * backend persistence, unlike cart/favorites) and survives navigating between pages, so the
 * floating tray (`CompareTray`) stays visible while browsing until the shopper clears it.
 */
@Injectable({ providedIn: 'root' })
export class CompareService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/products`;

  private readonly itemsSignal = signal<readonly CompareKey[]>(this.readStored());
  private readonly productsByIdSignal = signal<ReadonlyMap<string, Product>>(new Map());
  private readonly pendingIds = new Set<string>();

  readonly maxItems = MAX_COMPARE_ITEMS;
  readonly items = this.itemsSignal.asReadonly();
  readonly count = computed(() => this.itemsSignal().length);
  readonly isFull = computed(() => this.count() >= this.maxItems);

  /**
   * One entry per current item, same order, flattened to that item's variant - `null` while its
   * product is still being fetched (or if it failed and hasn't been dropped yet).
   */
  readonly products = computed<readonly (Product | null)[]>(() => {
    const cache = this.productsByIdSignal();
    return this.itemsSignal().map(({ productId, variantId }) => {
      const base = cache.get(productId);
      return base ? flattenToVariant(base, variantId) : null;
    });
  });

  constructor() {
    effect(() => {
      this.persist(this.itemsSignal());
    });

    // Fetches whatever product any current item points to and isn't cached yet.
    effect(() => {
      const cache = this.productsByIdSignal();
      const missing = [...new Set(this.itemsSignal().map((item) => item.productId))].filter(
        (id) => !cache.has(id),
      );
      if (missing.length > 0) {
        void this.fetchMissing(missing);
      }
    });
  }

  isComparing(productId: string, variantId: string = BASE_VARIANT_ID): boolean {
    return this.itemsSignal().some(
      (item) => item.productId === productId && item.variantId === variantId,
    );
  }

  /** No-op (returns `false`) if the list is already at `maxItems` and this would be a new entry. */
  toggle(productId: string, variantId: string = BASE_VARIANT_ID): boolean {
    if (this.isComparing(productId, variantId)) {
      this.remove(productId, variantId);
      return true;
    }
    return this.add(productId, variantId);
  }

  add(productId: string, variantId: string = BASE_VARIANT_ID): boolean {
    if (this.isComparing(productId, variantId)) return true;
    if (this.isFull()) return false;
    this.itemsSignal.update((items) => [...items, { productId, variantId }]);
    return true;
  }

  remove(productId: string, variantId: string = BASE_VARIANT_ID): void {
    this.itemsSignal.update((items) =>
      items.filter((item) => !(item.productId === productId && item.variantId === variantId)),
    );
  }

  clear(): void {
    this.itemsSignal.set([]);
  }

  private async fetchMissing(productIds: readonly string[]): Promise<void> {
    const toFetch = productIds.filter((id) => !this.pendingIds.has(id));
    if (toFetch.length === 0) return;
    toFetch.forEach((id) => this.pendingIds.add(id));

    try {
      const fetched = await Promise.all(
        toFetch.map(async (id) => {
          try {
            return await firstValueFrom(this.http.get<Product>(`${this.baseUrl}/${id}`));
          } catch {
            return null;
          }
        }),
      );

      this.productsByIdSignal.update((current) => {
        const next = new Map(current);
        fetched.forEach((product, index) => {
          if (product) next.set(toFetch[index], product);
        });
        return next;
      });

      // A product that 404'd (deleted/deactivated since being added) is dropped instead of
      // leaving a dead slot in the comparator.
      const failedIds = toFetch.filter((_id, index) => fetched[index] === null);
      if (failedIds.length > 0) {
        this.itemsSignal.update((items) =>
          items.filter((item) => !failedIds.includes(item.productId)),
        );
      }
    } finally {
      toFetch.forEach((id) => this.pendingIds.delete(id));
    }
  }

  private readStored(): readonly CompareKey[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persist(items: readonly CompareKey[]): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* Best-effort - storage may be unavailable (private browsing, quota, etc). */
    }
  }
}
