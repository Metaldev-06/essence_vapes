import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { Product } from '../../ecommerce/data/product.model';
import { AuthService } from '../auth/auth.service';

/**
 * Single source of truth for the current user's favorites - both the full list (for the
 * favorites page) and the id set (for heart icons on every product card/gallery across the
 * app). Loads on login/session-restore, clears on logout, and updates optimistically so a
 * heart toggled anywhere is reflected everywhere without a refetch.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly baseUrl = `${API_BASE_URL}/favorites`;

  private readonly productsSignal = signal<Product[]>([]);
  private readonly loadingSignal = signal(false);

  /** Favorited products, most recently favorited first. */
  readonly products = this.productsSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly ids = computed(() => new Set(this.productsSignal().map((product) => product.id)));

  constructor() {
    // Reruns only when isAuthenticated() actually flips - on startup session-restore, on
    // login/register, and on logout - never on every change-detection pass.
    effect(() => {
      if (this.authService.isAuthenticated()) {
        void this.refresh();
      } else {
        this.productsSignal.set([]);
      }
    });
  }

  isFavorite(productId: string): boolean {
    return this.ids().has(productId);
  }

  /** Toggles a favorite, redirecting a guest to login (preserving their current page) instead of failing silently. */
  async toggle(productId: string): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (this.isFavorite(productId)) {
      await this.remove(productId);
    } else {
      await this.add(productId);
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

  private async add(productId: string): Promise<void> {
    try {
      const product = await firstValueFrom(
        this.http.post<Product>(`${this.baseUrl}/${productId}`, {}),
      );
      this.productsSignal.update((items) =>
        items.some((item) => item.id === productId) ? items : [product, ...items],
      );
    } catch {
      /* Best-effort optimistic UI; the next refresh() reconciles with the server. */
    }
  }

  private async remove(productId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/${productId}`));
      this.productsSignal.update((items) => items.filter((item) => item.id !== productId));
    } catch {
      /* Best-effort optimistic UI; the next refresh() reconciles with the server. */
    }
  }
}
