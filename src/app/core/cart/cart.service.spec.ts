import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api.config';
import { authInterceptor } from '../auth/auth.interceptor';
import { AuthService } from '../auth/auth.service';
import type { Product } from '../../ecommerce/data/product.model';
import type { BackendCartItem } from './cart.model';
import { CartService } from './cart.service';

const TOKEN_STORAGE_KEY = 'essence-vapes-token';
const CART_STORAGE_KEY = 'essence-vapes-cart';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'sauvage-elixir',
    brand: 'Dior',
    name: 'Sauvage Elixir',
    subtitle: 'Extrait de Parfum',
    notes: ['Bergamota'],
    price: '$8.500',
    priceValue: 8500,
    accent: 'violet',
    category: 'perfumes',
    styles: ['intenso'],
    stock: 25,
    isActive: true,
    ...overrides,
  };
}

function backendItem(overrides: Partial<BackendCartItem> = {}): BackendCartItem {
  const product = overrides.product ?? makeProduct();
  return {
    productId: product?.id ?? 'sauvage-elixir',
    product,
    quantity: 1,
    availableStock: product?.stock ?? 25,
    isValid: true,
    ...overrides,
  };
}

/**
 * Drains the microtask queue AND flushes Angular's effect scheduler. A service-level `effect()`
 * (no component/fixture here to pump change detection) only reacts once `TestBed.flushEffects()`
 * is called, and each reaction can itself chain further awaits before a request actually
 * reaches the mock backend - so this interleaves both until the system settles.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.flushEffects();
  }
}

/**
 * `TestBed.flushEffects()`, called repeatedly with no component/fixture driving real change
 * detection, can re-run an already-settled effect more than once for a single transition - a
 * test-harness quirk, not a production code path (the real app's ApplicationRef scheduler
 * doesn't do this). `reconcileWithBackend`'s requests are idempotent (same productId/quantity
 * each time), so rather than assert an exact call count, this drains and answers EVERY pending
 * request matching `method`+`url` each round, repeating until a round finds none - proving the
 * system still converges to the right state no matter how many times it fired.
 */
async function drainAndRespond(
  httpMock: HttpTestingController,
  method: string,
  url: string,
  body: object | readonly unknown[],
): Promise<void> {
  for (let round = 0; round < 5; round++) {
    const pending = httpMock.match((req) => req.method === method && req.url === url);
    for (const req of pending) req.flush(body);
    await settle();
    if (pending.length === 0) return;
  }
}

function configureTestBed(): void {
  // Explicit, rather than relying on whatever auto-reset the runner wires up between tests -
  // a stray service singleton (and its own in-flight effect) surviving into the next test is
  // exactly the kind of bleed these tests are trying to catch, not fall victim to.
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
  });
}

function flushAuthMe(httpMock: HttpTestingController): void {
  httpMock.expectOne(`${API_BASE_URL}/auth/me`).flush({
    id: 'u1',
    email: 'cliente@test.com',
    fullName: 'Cliente',
    role: 'regular',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
}

/** Logs a user in (via session-restore) and drains the reconciliation this triggers in CartService. */
async function loginAndReconcile(
  httpMock: HttpTestingController,
  cartAfterReconcile: BackendCartItem[],
  localLineToPush?: { productId: string; quantity: number },
): Promise<void> {
  await settle();
  flushAuthMe(httpMock);
  await settle();

  if (localLineToPush) {
    await drainAndRespond(
      httpMock,
      'PUT',
      `${API_BASE_URL}/cart/items/${localLineToPush.productId}`,
      backendItem({ quantity: localLineToPush.quantity }),
    );
  }

  await drainAndRespond(httpMock, 'GET', `${API_BASE_URL}/cart`, cartAfterReconcile);
}

describe('CartService', () => {
  afterEach(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(CART_STORAGE_KEY);
  });

  it('never calls the backend for a guest and persists to sessionStorage', async () => {
    configureTestBed();
    const service = TestBed.inject(CartService);
    const httpMock = TestBed.inject(HttpTestingController);

    const result = await service.add(makeProduct(), 2);

    expect(result.success).toBe(true);
    expect(service.itemCount()).toBe(2);
    httpMock.expectNone(`${API_BASE_URL}/cart`);
    httpMock.verify();

    const stored = JSON.parse(sessionStorage.getItem(CART_STORAGE_KEY) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].quantity).toBe(2);
  });

  it('rejects adding more than the known stock for a guest', async () => {
    configureTestBed();
    const service = TestBed.inject(CartService);

    const result = await service.add(makeProduct({ stock: 1 }), 2);

    expect(result.success).toBe(false);
    expect(service.itemCount()).toBe(0);
  });

  it("does not wipe a true guest's cart on startup (no token, never authenticated)", async () => {
    sessionStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        {
          productId: 'sauvage-elixir',
          product: makeProduct(),
          quantity: 3,
          availableStock: 25,
          isValid: true,
        },
      ]),
    );

    configureTestBed();
    const service = TestBed.inject(CartService);
    const httpMock = TestBed.inject(HttpTestingController);

    await settle();

    expect(service.itemCount()).toBe(3);
    httpMock.expectNone(`${API_BASE_URL}/cart`);
    httpMock.verify();
  });

  it('merges a local cart into the backend on login, then adopts the merged result', async () => {
    sessionStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        {
          productId: 'sauvage-elixir',
          product: makeProduct(),
          quantity: 2,
          availableStock: 25,
          isValid: true,
        },
      ]),
    );
    localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-token');

    configureTestBed();
    TestBed.inject(AuthService); // constructs first, same as it would via DI in the app
    const service = TestBed.inject(CartService);
    const httpMock = TestBed.inject(HttpTestingController);

    await loginAndReconcile(httpMock, [backendItem({ quantity: 2 })], {
      productId: 'sauvage-elixir',
      quantity: 2,
    });

    expect(service.itemCount()).toBe(2);
    expect(service.lines()[0]?.product.id).toBe('sauvage-elixir');
    httpMock.verify();
  });

  it('clears the cart on logout so the next user on a shared tab never inherits it', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-token');
    configureTestBed();
    const authService = TestBed.inject(AuthService);
    const service = TestBed.inject(CartService);
    const httpMock = TestBed.inject(HttpTestingController);

    await loginAndReconcile(httpMock, [backendItem()]);
    expect(service.itemCount()).toBe(1);

    authService.logout();
    await settle();

    expect(service.itemCount()).toBe(0);
    expect(sessionStorage.getItem(CART_STORAGE_KEY)).toBe('[]');
    httpMock.verify();
  });

  it('validateBeforeCheckout drops whatever the backend reports as no longer valid', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-token');
    configureTestBed();
    TestBed.inject(AuthService);
    const service = TestBed.inject(CartService);
    const httpMock = TestBed.inject(HttpTestingController);

    await loginAndReconcile(httpMock, [backendItem({ quantity: 2 })]);
    expect(service.itemCount()).toBe(2);

    const validation = service.validateBeforeCheckout();
    const validateReq = httpMock.expectOne(`${API_BASE_URL}/cart/validate`);
    expect(validateReq.request.method).toBe('POST');
    validateReq.flush({
      items: [],
      removed: [backendItem({ quantity: 2, availableStock: 1, isValid: false })],
    });

    const removed = await validation;

    expect(removed).toHaveLength(1);
    expect(removed[0].productId).toBe('sauvage-elixir');
    expect(service.itemCount()).toBe(0);

    httpMock.verify();
  });
});
