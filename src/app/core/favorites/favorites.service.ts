import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { BASE_VARIANT_ID, type Product } from '../../ecommerce/data/product.model';
import { AuthService } from '../auth/auth.service';

const toKey = (productId: string, variantId: string): string => `${productId}::${variantId}`;

/**
 * Single source of truth for the current user's favorites - both the full list (for the
 * favorites page) and the id set (for heart icons on every product card/gallery across the
 * app). Loads on login/session-restore, clears on logout, and updates optimistically so a
 * heart toggled anywhere is reflected everywhere without a refetch.
 *
 * Favorites are per VARIANT (same `productId::variantId` key the cart uses), not per product -
 * favoriting a 2ml decant must not also favorite its 5ml sibling or the base product.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly baseUrl = `${API_BASE_URL}/favorites`;

  private readonly productsSignal = signal<Product[]>([]);
  private readonly loadingSignal = signal(false);

  /** Favorited product variants, most recently favorited first. */
  readonly products = this.productsSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly ids = computed(
    () => new Set(this.productsSignal().map((product) => toKey(product.id, product.variantId))),
  );

  constructor() {
    // Angular can re-run an effect more than once for what is logically the same
    // authenticated state (its scheduler doesn't guarantee exactly-once-per-transition), so
    // this tracks whether the CURRENT state has already been reacted to - otherwise every
    // extra re-run while still logged in would re-fetch the list for no reason.
    let hasSeenAuthenticated = false;

    effect(() => {
      const authenticated = this.authService.isAuthenticated();
      if (authenticated && !hasSeenAuthenticated) {
        hasSeenAuthenticated = true;
        void this.refresh();
      } else if (!authenticated && hasSeenAuthenticated) {
        hasSeenAuthenticated = false;
        this.productsSignal.set([]);
      }
    });
  }

  isFavorite(productId: string, variantId: string = BASE_VARIANT_ID): boolean {
    return this.ids().has(toKey(productId, variantId));
  }

  /** Toggles a favorite, redirecting a guest to login (preserving their current page) instead of failing silently. */
  async toggle(productId: string, variantId: string = BASE_VARIANT_ID): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (this.isFavorite(productId, variantId)) {
      await this.remove(productId, variantId);
    } else {
      await this.add(productId, variantId);
    }
  }

  async refresh(): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const products = await firstValueFrom(this.http.get<Product[]>(this.baseUrl));
      this.productsSignal.set(products);
    } catch {
      this.productsSignal.set([]);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  private async add(productId: string, variantId: string): Promise<void> {
    try {
      const product = await firstValueFrom(
        this.http.post<Product>(`${this.baseUrl}/${productId}`, { variantId }),
      );
      this.productsSignal.update((items) =>
        items.some((item) => item.id === productId && item.variantId === variantId)
          ? items
          : [product, ...items],
      );
    } catch {
      /* Best-effort optimistic UI; the next refresh() reconciles with the server. */
    }
  }

  private async remove(productId: string, variantId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.baseUrl}/${productId}`, { params: { variantId } }),
      );
      this.productsSignal.update((items) =>
        items.filter((item) => !(item.id === productId && item.variantId === variantId)),
      );
    } catch {
      /* Best-effort optimistic UI; the next refresh() reconciles with the server. */
    }
  }
}
