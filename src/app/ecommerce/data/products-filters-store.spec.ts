import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { Component, DestroyRef, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import {
  DEFAULT_PRODUCTS_FILTERS,
  ProductsFiltersStore,
  isCatalogUrl,
  isModifiedClick,
  isProductDetailUrl,
  type ProductsFiltersSnapshot,
} from './products-filters-store';

describe('isModifiedClick', () => {
  const click = (init: MouseEventInit = {}) => new MouseEvent('click', { button: 0, ...init });

  it('un click izquierdo común no es "modificado"', () => {
    expect(isModifiedClick(click())).toBe(false);
  });

  it('Ctrl, Cmd, Shift, Alt o el botón del medio abren otra pestaña o ventana', () => {
    expect(isModifiedClick(click({ ctrlKey: true }))).toBe(true);
    expect(isModifiedClick(click({ metaKey: true }))).toBe(true);
    expect(isModifiedClick(click({ shiftKey: true }))).toBe(true);
    expect(isModifiedClick(click({ altKey: true }))).toBe(true);
    expect(isModifiedClick(click({ button: 1 }))).toBe(true);
  });
});

describe('ProductsFiltersStore.showCategory', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => sessionStorage.clear());

  it('guarda la categoría con el resto de los filtros en su valor inicial', () => {
    const store = TestBed.inject(ProductsFiltersStore);
    store.write({ ...DEFAULT_PRODUCTS_FILTERS, brand: 'Valentino', styles: ['fresco'], term: 'roma' });

    store.showCategory('perfumes');

    expect(store.read()).toEqual({ ...DEFAULT_PRODUCTS_FILTERS, category: 'perfumes' });
  });

  it('avisa a un catálogo ya abierto', () => {
    const store = TestBed.inject(ProductsFiltersStore);
    const received: ProductsFiltersSnapshot[] = [];
    store.applied$.subscribe((snapshot) => received.push(snapshot));

    store.showCategory('vapes');

    expect(received).toEqual([{ ...DEFAULT_PRODUCTS_FILTERS, category: 'vapes' }]);
  });
});

describe('reglas de URL del catálogo', () => {
  it('reconoce la vista de un producto', () => {
    expect(isProductDetailUrl('/productos/abc-123')).toBe(true);
    expect(isProductDetailUrl('/productos/abc-123?variant=v2')).toBe(true);
    expect(isProductDetailUrl('/productos')).toBe(false);
    expect(isProductDetailUrl('/productos?cat=perfumes')).toBe(false);
    expect(isProductDetailUrl('/productosx/abc')).toBe(false);
    expect(isProductDetailUrl('/contacto')).toBe(false);
  });

  it('el catálogo incluye el listado y la vista de productos', () => {
    expect(isCatalogUrl('/productos')).toBe(true);
    expect(isCatalogUrl('/productos?cat=perfumes')).toBe(true);
    expect(isCatalogUrl('/productos/abc')).toBe(true);
    expect(isCatalogUrl('/productos-viejos')).toBe(false);
    expect(isCatalogUrl('/favoritos')).toBe(false);
    expect(isCatalogUrl('/')).toBe(false);
  });
});

// Páginas mínimas que avisan al store al cerrarse, igual que las reales.
@Component({ template: 'catálogo' })
class CatalogPage {
  constructor() {
    const store = inject(ProductsFiltersStore);
    inject(DestroyRef).onDestroy(() => store.leaveCatalog());
  }
}

@Component({ template: 'producto' })
class ProductPage {
  constructor() {
    const store = inject(ProductsFiltersStore);
    inject(DestroyRef).onDestroy(() => store.leaveProductView());
  }
}

@Component({ template: 'otra sección' })
class OtherPage {}

const PERFUMES_FILTERS: ProductsFiltersSnapshot = {
  ...DEFAULT_PRODUCTS_FILTERS,
  category: 'perfumes',
  brand: 'Jean Paul Gaultier',
  styles: ['fresco'],
  sort: 'precio-asc',
};

describe('ProductsFiltersStore: cuándo se conservan los filtros', () => {
  let harness: RouterTestingHarness;
  let store: ProductsFiltersStore;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'productos', component: CatalogPage },
          { path: 'productos/:id', component: ProductPage },
          { path: 'contacto', component: OtherPage },
        ]),
        provideLocationMocks(),
      ],
    });
    harness = await RouterTestingHarness.create();
    store = TestBed.inject(ProductsFiltersStore);

    await harness.navigateByUrl('/productos');
    store.write(PERFUMES_FILTERS);
  });

  afterEach(() => sessionStorage.clear());

  async function goBack(): Promise<void> {
    TestBed.inject(Location).back();
    await harness.fixture.whenStable();
  }

  it('entrar a un producto y volver atrás conserva los filtros', async () => {
    await harness.navigateByUrl('/productos/abc');
    expect(store.read()).toEqual(PERFUMES_FILTERS);

    await goBack();

    expect(TestBed.inject(Location).path()).toBe('/productos');
    expect(store.read()).toEqual(PERFUMES_FILTERS);
  });

  it('pasar de un producto a otro relacionado y volver también los conserva', async () => {
    await harness.navigateByUrl('/productos/abc');
    await harness.navigateByUrl('/productos/def');
    await goBack();
    await goBack();

    expect(TestBed.inject(Location).path()).toBe('/productos');
    expect(store.read()).toEqual(PERFUMES_FILTERS);
  });

  it('ir a otra sección desde el catálogo los reinicia', async () => {
    await harness.navigateByUrl('/contacto');

    expect(store.read()).toEqual(DEFAULT_PRODUCTS_FILTERS);
  });

  it('ir a otra sección desde la vista de un producto los reinicia', async () => {
    await harness.navigateByUrl('/productos/abc');
    await harness.navigateByUrl('/contacto');

    expect(store.read()).toEqual(DEFAULT_PRODUCTS_FILTERS);
  });

  it('si la página se cierra sin una navegación en curso, los reinicia', () => {
    store.leaveCatalog();

    expect(store.read()).toEqual(DEFAULT_PRODUCTS_FILTERS);
  });
});
