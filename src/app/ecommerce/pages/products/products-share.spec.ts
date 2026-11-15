import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../../core/config/api.config';
import { DEFAULT_PRODUCTS_FILTERS, ProductsFiltersStore } from '../../data/products-filters-store';
import { sharedFiltersResolver } from '../../data/shared-filters-api';
import Products from './products';

const EMPTY_PAGE = { data: [], pagination: { total: 0, pages: 0, current: 1, limit: 12, offset: 0 } };
const SHARED_URL = `${API_BASE_URL}/shared-filters`;

// Los filtros de la captura del usuario.
const SCREENSHOT_FILTERS = {
  ...DEFAULT_PRODUCTS_FILTERS,
  category: 'perfumes' as const,
  brand: 'Jean Paul Gaultier',
  gender: 'masculino' as const,
  styles: ['tropical', 'amaderado'] as ('tropical' | 'amaderado')[],
};

/** Responde lo pendiente del catálogo (lista vacía, marcas/capacidades vacías). Los pedidos de
 *  links compartidos los responde cada test. */
function flushCatalog(): void {
  for (const req of TestBed.inject(HttpTestingController).match(() => true)) {
    if (req.cancelled || req.request.url.startsWith(SHARED_URL)) continue;
    req.flush(req.request.url === `${API_BASE_URL}/products` ? EMPTY_PAGE : []);
  }
}

function lastListRequest() {
  return TestBed.inject(HttpTestingController)
    .match((req) => req.url === `${API_BASE_URL}/products`)
    .filter((req) => !req.cancelled)
    .at(-1);
}

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class Host {}

describe('Products - abrir un link compartido', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'productos',
            component: Products,
            resolve: { sharedFilters: sharedFiltersResolver },
            runGuardsAndResolvers: 'paramsOrQueryParamsChange',
          },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    // Otros filtros guardados de antes: el link compartido tiene prioridad.
    TestBed.inject(ProductsFiltersStore).write({ ...DEFAULT_PRODUCTS_FILTERS, category: 'vapes' });
    TestBed.createComponent(Host);
  });

  afterEach(() => {
    flushCatalog();
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  it('link corto: trae los filtros del código ANTES de mostrar el catálogo y limpia la URL', async () => {
    const router = TestBed.inject(Router);
    const navigation = router.navigateByUrl('/productos?c=k7Qx2m');

    // El resolver arranca apenas empieza la navegación (asíncrona).
    const lookup = await vi.waitFor(() => TestBed.inject(HttpTestingController).expectOne(`${SHARED_URL}/k7Qx2m`));
    // Mientras se busca el código, el catálogo todavía no pidió nada.
    expect(lastListRequest()).toBeUndefined();
    lookup.flush({ ...SCREENSHOT_FILTERS });
    await navigation;
    TestBed.tick();

    const list = lastListRequest();
    expect(list?.request.params.get('category')).toBe('perfumes');
    expect(list?.request.params.get('brand')).toBe('Jean Paul Gaultier');
    expect(list?.request.params.get('gender')).toBe('masculino');
    expect(list?.request.params.get('styles')).toBe('tropical,amaderado');

    flushCatalog();
    TestBed.tick();
    await vi.waitFor(() => expect(router.url).toBe('/productos'));
    expect(TestBed.inject(ProductsFiltersStore).read()).toEqual(SCREENSHOT_FILTERS);
  });

  it('un código que ya no existe abre el catálogo como siempre (y limpia la URL)', async () => {
    const router = TestBed.inject(Router);
    const navigation = router.navigateByUrl('/productos?c=noExiste');
    const lookup = await vi.waitFor(() => TestBed.inject(HttpTestingController).expectOne(`${SHARED_URL}/noExiste`));
    lookup.flush({ message: 'Este link compartido ya no está disponible.' }, { status: 404, statusText: 'Not Found' });
    await navigation;
    TestBed.tick();

    expect(lastListRequest()?.request.params.get('category')).toBe('vapes');
    flushCatalog();
    TestBed.tick();
    await vi.waitFor(() => expect(router.url).toBe('/productos'));
  });

  it('el link largo (respaldo si el servidor no dio código) sigue funcionando', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(
      '/productos?categoria=perfumes&marca=Jean%20Paul%20Gaultier&genero=masculino&estilos=tropical,amaderado',
    );
    TestBed.tick();

    expect(lastListRequest()?.request.params.get('brand')).toBe('Jean Paul Gaultier');
    flushCatalog();
    TestBed.tick();
    await vi.waitFor(() => expect(router.url).toBe('/productos'));
  });
});

describe('Products - botón Compartir', () => {
  const writeText = vi.fn();

  async function render() {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(Products);
    TestBed.tick();
    flushCatalog();
    await fixture.whenStable();

    // En el orden en que los elige una persona: la categoría primero (reinicia marca y estilos).
    const page = fixture.componentInstance as unknown as Record<string, WritableSignal<unknown>> & {
      toggleStyle(style: string): void;
    };
    page['activeCategory'].set('perfumes');
    TestBed.tick();
    flushCatalog();
    page['activeBrand'].set('Jean Paul Gaultier');
    page['activeGender'].set('masculino');
    page.toggleStyle('tropical');
    page.toggleStyle('amaderado');
    TestBed.tick();
    flushCatalog();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.products-share')!;
    return { fixture, button };
  }

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  });

  afterEach(() => {
    flushCatalog();
    TestBed.inject(HttpTestingController).verify();
    delete (navigator as { clipboard?: unknown }).clipboard;
    delete (navigator as { share?: unknown }).share;
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('en la computadora copia el link corto y avisa', async () => {
    const { button } = await render();

    button.click();
    const create = TestBed.inject(HttpTestingController).expectOne({ method: 'POST', url: SHARED_URL });
    expect(create.request.body).toMatchObject({
      category: 'perfumes',
      brand: 'Jean Paul Gaultier',
      gender: 'masculino',
      styles: ['tropical', 'amaderado'],
    });
    create.flush({ code: 'k7Qx2m' });

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(`${document.location.origin}/productos?c=k7Qx2m`));
    TestBed.tick();
    await vi.waitFor(() => expect(button.textContent).toContain('¡Link copiado!'));
  });

  it('pasar el mouse por el botón ya pide el código, y el click lo usa sin pedirlo de nuevo', async () => {
    const { button } = await render();

    button.dispatchEvent(new Event('pointerenter'));
    TestBed.inject(HttpTestingController).expectOne({ method: 'POST', url: SHARED_URL }).flush({ code: 'k7Qx2m' });
    await Promise.resolve();

    button.click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(`${document.location.origin}/productos?c=k7Qx2m`));
    TestBed.inject(HttpTestingController).expectNone({ method: 'POST', url: SHARED_URL });
  });

  it('si el servidor no da el código, comparte el link largo, que también funciona', async () => {
    const { button } = await render();

    button.click();
    TestBed.inject(HttpTestingController)
      .expectOne({ method: 'POST', url: SHARED_URL })
      .flush({ message: 'caído' }, { status: 503, statusText: 'Service Unavailable' });

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const url = new URL(writeText.mock.calls[0][0] as string);
    expect(url.searchParams.get('marca')).toBe('Jean Paul Gaultier');
    expect(url.searchParams.get('estilos')).toBe('tropical,amaderado');
  });

  it('en el celular abre el menú de compartir con el link corto y un texto descriptivo', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)' }));
    const { button } = await render();

    // El dedo se apoya (pide el código) y después suelta (click).
    button.dispatchEvent(new Event('pointerdown'));
    TestBed.inject(HttpTestingController).expectOne({ method: 'POST', url: SHARED_URL }).flush({ code: 'k7Qx2m' });
    await Promise.resolve();
    button.click();

    await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const data = share.mock.calls[0][0] as ShareData;
    expect(data.url).toBe(`${document.location.origin}/productos?c=k7Qx2m`);
    expect(data.text).toBe('Perfumes · Jean Paul Gaultier · Masculino · Tropical, Amaderado');
    expect(writeText).not.toHaveBeenCalled();
  });
});
