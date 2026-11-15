import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api.config';
import type { Product } from './product.model';
import { PRODUCT_PREFETCH_TTL_MS, ProductsService } from './products.service';

const productUrl = (id: string): string => `${API_BASE_URL}/products/${id}`;
const product = (id: string, stock = 1): Product => ({ id, name: `Producto ${id}`, stock }) as unknown as Product;

describe('ProductsService - ficha del producto y precarga', () => {
  let service: ProductsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProductsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  /** Lo que hace la ficha al abrirse: crea el recurso y lo deja arrancar. */
  function openDetail(id: string) {
    const ref = TestBed.runInInjectionContext(() => service.byId(signal(id)));
    TestBed.tick();
    return ref;
  }

  it('sin precarga, la ficha pide el producto una vez', async () => {
    const ref = openDetail('p1');

    http.expectOne(productUrl('p1')).flush(product('p1'));

    await vi.waitFor(() => expect(ref.value()?.id).toBe('p1'));
  });

  it('pasar el mouse y hacer clic hace UN solo pedido (antes eran dos)', async () => {
    service.prefetchProduct('p1');
    const prefetch = http.expectOne(productUrl('p1'));

    const ref = openDetail('p1');
    http.expectNone(productUrl('p1'));

    prefetch.flush(product('p1'));
    await vi.waitFor(() => expect(ref.value()?.id).toBe('p1'));
  });

  it('si la precarga ya terminó, la ficha la usa sin esperar al servidor', async () => {
    service.prefetchProduct('p1');
    http.expectOne(productUrl('p1')).flush(product('p1'));

    const ref = openDetail('p1');

    http.expectNone(productUrl('p1'));
    await vi.waitFor(() => expect(ref.value()?.id).toBe('p1'));
  });

  it('pasar el mouse varias veces por la misma card no repite el pedido', () => {
    service.prefetchProduct('p1');
    service.prefetchProduct('p1');
    service.prefetchProduct('p1');

    http.expectOne(productUrl('p1')).flush(product('p1'));
  });

  it('la precarga es de un solo uso: la próxima visita trae datos frescos', async () => {
    service.prefetchProduct('p1');
    http.expectOne(productUrl('p1')).flush(product('p1', 5));
    const first = openDetail('p1');
    await vi.waitFor(() => expect(first.value()?.stock).toBe(5));

    const second = openDetail('p1');

    http.expectOne(productUrl('p1')).flush(product('p1', 2));
    await vi.waitFor(() => expect(second.value()?.stock).toBe(2));
  });

  it('una precarga vieja no se usa: el stock o el precio pueden haber cambiado', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    service.prefetchProduct('p1');
    http.expectOne(productUrl('p1')).flush(product('p1', 5));

    now.mockReturnValue(1_000_000 + PRODUCT_PREFETCH_TTL_MS + 1);
    const ref = openDetail('p1');

    http.expectOne(productUrl('p1')).flush(product('p1', 0));
    await vi.waitFor(() => expect(ref.value()?.stock).toBe(0));
  });

  it('si la precarga falló, la ficha lo pide de nuevo en vez de mostrar el error', async () => {
    service.prefetchProduct('p1');
    http.expectOne(productUrl('p1')).flush('caído', { status: 503, statusText: 'Service Unavailable' });

    const ref = openDetail('p1');

    http.expectOne(productUrl('p1')).flush(product('p1'));
    await vi.waitFor(() => expect(ref.value()?.id).toBe('p1'));
  });

  it('loadForNavigation espera el producto y la ficha reutiliza ese mismo pedido', async () => {
    const pending = service.loadForNavigation('p1', 1_000);
    http.expectOne(productUrl('p1')).flush(product('p1'));

    await expect(pending).resolves.toEqual(product('p1'));

    const ref = openDetail('p1');
    http.expectNone(productUrl('p1'));
    await vi.waitFor(() => expect(ref.value()?.id).toBe('p1'));
  });

  it('loadForNavigation no espera más que el tiempo máximo', async () => {
    vi.useFakeTimers();
    try {
      const pending = service.loadForNavigation('p1', 350);
      const request = http.expectOne(productUrl('p1'));

      vi.advanceTimersByTime(350);
      await expect(pending).resolves.toBeUndefined();

      request.flush(product('p1'));
    } finally {
      vi.useRealTimers();
    }
  });

  it('"También te puede gustar" pide solo los relacionados del producto, no la categoría entera', async () => {
    const ref = TestBed.runInInjectionContext(() => service.related(signal('p1')));
    TestBed.tick();

    const request = http.expectOne(`${API_BASE_URL}/products/p1/related`);
    expect(request.request.params.keys()).toEqual([]);
    request.flush([product('p2'), product('p3')]);

    await vi.waitFor(() => expect(ref.value().map((p) => p.id)).toEqual(['p2', 'p3']));
  });

  it('si la precarga falla mientras la ficha la espera, reintenta una vez', async () => {
    service.prefetchProduct('p1');
    const prefetch = http.expectOne(productUrl('p1'));
    const ref = openDetail('p1');

    prefetch.flush('caído', { status: 503, statusText: 'Service Unavailable' });

    http.expectOne(productUrl('p1')).flush(product('p1'));
    await vi.waitFor(() => expect(ref.value()?.id).toBe('p1'));
  });
});
