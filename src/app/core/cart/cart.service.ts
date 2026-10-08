import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { Product } from '../../ecommerce/data/product.model';
import { AuthService } from '../auth/auth.service';
import type {
  BackendCartItem,
  BackendCartValidation,
  CartLine,
  CartMutationResult,
  ProductStockInfo,
} from './cart.model';

const CART_STORAGE_KEY = 'essence-vapes-cart';

/**
 * The cart lives in `sessionStorage` for every visitor (guest or not) and, additionally, in the
 * backend for logged-in users - that's the only way it survives losing the tab. The two are
 * reconciled on login (merge whatever's local into the account, then adopt the backend's
 * answer) and kept in sync on every mutation after that; a guest never touches the backend's
 * cart at all. Stock is re-checked (never trusted from cache) on every cart view and, more
 * strictly, right before checkout - where anything that no longer fits is actually dropped.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${API_BASE_URL}/cart`;
  private readonly productsBaseUrl = `${API_BASE_URL}/products`;

  private readonly linesSignal = signal<CartLine[]>(this.readStoredCart());
  private readonly loadingSignal = signal(false);
  private reconcilingNow = false;

  readonly lines = this.linesSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly itemCount = computed(() =>
    this.linesSignal().reduce((sum, line) => sum + line.quantity, 0),
  );
  readonly subtotalValue = computed(() =>
    this.linesSignal().reduce((sum, line) => sum + line.product.priceValue * line.quantity, 0),
  );

  constructor() {
    // Tracks whether THIS effect has already reacted to the current authenticated state, so
    // a re-run while it STAYS true (its very first run included - always `false`, before
    // session-restore has had a chance to resolve) never re-triggers reconciliation or is
    // mistaken for a real logout. Without the `authenticated && !hasSeenAuthenticated` guard,
    // every extra time the effect happens to re-run while still logged in would kick off a
    // fresh, redundant PUT+GET round-trip against a cart that's already in sync.
    let hasSeenAuthenticated = false;

    effect(() => {
      const authenticated = this.authService.isAuthenticated();
      if (authenticated && !hasSeenAuthenticated) {
        hasSeenAuthenticated = true;
        void this.reconcileWithBackend();
      } else if (!authenticated && hasSeenAuthenticated) {
        // A real logout: clear so a different person on this shared tab never inherits it.
        hasSeenAuthenticated = false;
        this.linesSignal.set([]);
        this.persist();
      }
    });
  }

  getQuantity(productId: string): number {
    return this.linesSignal().find((line) => line.productId === productId)?.quantity ?? 0;
  }

  async add(product: Product, quantityToAdd = 1): Promise<CartMutationResult> {
    const nextQuantity = this.getQuantity(product.id) + quantityToAdd;
    return this.setQuantity(product, nextQuantity);
  }

  async setQuantity(product: Product, quantity: number): Promise<CartMutationResult> {
    if (quantity <= 0) {
      await this.remove(product.id);
      return { success: true };
    }

    if (this.authService.isAuthenticated()) {
      try {
        const item = await firstValueFrom(
          this.http.put<BackendCartItem>(`${this.baseUrl}/items/${product.id}`, { quantity }),
        );
        this.upsertLocal(this.fromBackendItem(item));
        return { success: true };
      } catch (error) {
        return { success: false, message: this.extractErrorMessage(error) };
      }
    }

    // Guest: no backend to ask, so trust the stock already on hand (whatever the catalog/detail
    // page most recently fetched) - it gets re-checked for real on the next revalidation anyway.
    if (quantity > product.stock) {
      return {
        success: false,
        message:
          product.stock === 0
            ? 'Este producto no tiene stock disponible'
            : `Solo quedan ${product.stock} unidades disponibles de este producto`,
      };
    }

    this.upsertLocal({
      productId: product.id,
      product,
      quantity,
      availableStock: product.stock,
      isValid: true,
    });
    return { success: true };
  }

  async remove(productId: string): Promise<void> {
    this.linesSignal.update((lines) => lines.filter((line) => line.productId !== productId));
    this.persist();

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(this.http.delete(`${this.baseUrl}/items/${productId}`));
      } catch {
        /* Best-effort; the next revalidation reconciles with the backend. */
      }
    }
  }

  async clear(): Promise<void> {
    this.linesSignal.set([]);
    this.persist();

    if (this.authService.isAuthenticated()) {
      try {
        await firstValueFrom(this.http.delete(this.baseUrl));
      } catch {
        /* Best-effort; the next revalidation reconciles with the backend. */
      }
    }
  }

  /**
   * Refreshes `availableStock`/`isValid` on every line in place - called whenever the cart is
   * opened, so a product that's been out of stock since the last visit shows that immediately.
   * Never removes anything by itself; see `validateBeforeCheckout` for the actual gate.
   */
  async revalidateStock(): Promise<void> {
    if (this.linesSignal().length === 0) return;

    this.loadingSignal.set(true);
    try {
      if (this.authService.isAuthenticated()) {
        const items = await firstValueFrom(this.http.get<BackendCartItem[]>(this.baseUrl));
        this.linesSignal.set(this.fromBackendItems(items));
      } else {
        await this.refreshGuestStockInPlace();
      }
      this.persist();
    } catch {
      /* Keep whatever's cached; the checkout gate is the check that actually matters. */
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * The checkout gate: re-validates against live stock and, unlike `revalidateStock`, actually
   * drops whatever no longer fits - returning those lines so the UI can tell the user what (and
   * why) disappeared before letting them continue.
   */
  async validateBeforeCheckout(): Promise<CartLine[]> {
    this.loadingSignal.set(true);
    try {
      if (this.authService.isAuthenticated()) {
        const result = await firstValueFrom(
          this.http.post<BackendCartValidation>(`${this.baseUrl}/validate`, {}),
        );
        this.linesSignal.set(this.fromBackendItems(result.items));
        this.persist();
        return this.fromBackendItems(result.removed);
      }

      try {
        await this.refreshGuestStockInPlace();
      } catch {
        // Can't reach the server right now - proceed with whatever was already known rather
        // than blocking checkout on a network hiccup.
      }
      const invalid = this.linesSignal().filter((line) => !line.isValid);
      if (invalid.length > 0) {
        this.linesSignal.update((lines) => lines.filter((line) => line.isValid));
      }
      this.persist();
      return invalid;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Pushes a guest/stale local cart into the backend on login, then adopts its answer as truth.
   * Guarded against overlapping calls - `isAuthenticated` could in principle flip quickly more
   * than once before the first run finishes, and reconciling the same cart concurrently with
   * itself would just race two merges instead of running one cleanly after the other.
   */
  private async reconcileWithBackend(): Promise<void> {
    if (this.reconcilingNow) return;
    this.reconcilingNow = true;

    const local = this.linesSignal();
    this.loadingSignal.set(true);
    try {
      if (local.length > 0) {
        await Promise.all(
          local.map((line) =>
            firstValueFrom(
              this.http.put<BackendCartItem>(`${this.baseUrl}/items/${line.productId}`, {
                quantity: line.quantity,
              }),
            ).catch(() => null),
          ),
        );
      }
      const items = await firstValueFrom(this.http.get<BackendCartItem[]>(this.baseUrl));
      this.linesSignal.set(this.fromBackendItems(items));
      this.persist();
    } catch {
      /* Keep whatever's local; the cart page's own revalidation will retry. */
    } finally {
      this.loadingSignal.set(false);
      this.reconcilingNow = false;
    }
  }

  /** Guest-only: re-fetches stock for current lines and updates availableStock/isValid in place. */
  private async refreshGuestStockInPlace(): Promise<void> {
    const lines = this.linesSignal();
    if (lines.length === 0) return;

    const ids = lines.map((line) => line.productId);
    const stocks = await firstValueFrom(
      this.http.get<ProductStockInfo[]>(`${this.productsBaseUrl}/stock`, {
        params: { ids: ids.join(',') },
      }),
    );
    const stockById = new Map(stocks.map((info) => [info.id, info]));
    this.linesSignal.update((current) =>
      current.map((line) => {
        const info = stockById.get(line.productId);
        const availableStock = info?.isActive ? info.stock : 0;
        return { ...line, availableStock, isValid: availableStock >= line.quantity };
      }),
    );
  }

  private upsertLocal(line: CartLine | null): void {
    if (!line) return;

    this.linesSignal.update((lines) => {
      const index = lines.findIndex((existing) => existing.productId === line.productId);
      if (index === -1) return [...lines, line];
      const next = [...lines];
      next[index] = line;
      return next;
    });
    this.persist();
  }

  private fromBackendItems(items: BackendCartItem[]): CartLine[] {
    return items
      .map((item) => this.fromBackendItem(item))
      .filter((line): line is CartLine => line !== null);
  }

  private fromBackendItem(item: BackendCartItem): CartLine | null {
    if (!item.product) return null;
    return {
      productId: item.productId,
      product: item.product,
      quantity: item.quantity,
      availableStock: item.availableStock,
      isValid: item.isValid,
    };
  }

  private persist(): void {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.linesSignal()));
    } catch {
      /* Private browsing or storage disabled: cart just won't survive a reload this tab. */
    }
  }

  private readStoredCart(): CartLine[] {
    try {
      const raw = sessionStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
    } catch {
      return [];
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | null;
      if (Array.isArray(body?.message)) return body.message[0] ?? 'Ocurrió un error inesperado';
      if (typeof body?.message === 'string') return body.message;
      if (error.status === 0) return 'No pudimos conectar con el servidor. Probá de nuevo.';
    }
    return 'Ocurrió un error inesperado. Probá de nuevo.';
  }
}
