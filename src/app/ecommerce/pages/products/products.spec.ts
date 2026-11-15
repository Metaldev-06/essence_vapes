import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../../core/config/api.config';
import {
  DEFAULT_PRODUCTS_FILTERS,
  ProductsFiltersStore,
  type ProductsFiltersSnapshot,
} from '../../data/products-filters-store';
import Products from './products';

const EMPTY_PAGE = {
  data: [],
  pagination: { total: 0, pages: 0, current: 1, limit: 12, offset: 0 },
};

describe('Products', () => {
  let component: Products;
  let fixture: ComponentFixture<Products>;

  beforeEach(async () => {
    sessionStorage.removeItem('ev:products-filters');
    await TestBed.configureTestingModule({
      imports: [Products],
      // Router: links de las cards y de los filtros. HTTP de prueba: ningún pedido sale a la red.
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Products);
    component = fixture.componentInstance;

    // Al crearse pide las marcas y la primera página del catálogo: sin respuesta, el componente
    // nunca queda estable y `whenStable()` se cuelga. Se responde un catálogo vacío.
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${API_BASE_URL}/products/brands`).flush([]);
    http.expectOne((req) => req.url === `${API_BASE_URL}/products`).flush(EMPTY_PAGE);
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.removeItem('ev:products-filters');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('estilos del buscador "Encontrá tu esencia" al cambiar de categoría', () => {
    /** Cambia la categoría como el sidebar, responde lo pendiente y devuelve los estilos con los
     *  que quedó pedido el catálogo. */
    async function selectCategory(category: string): Promise<string | null> {
      (component as unknown as { activeCategory: WritableSignal<string> }).activeCategory.set(category);
      TestBed.tick();
      const http = TestBed.inject(HttpTestingController);
      const pending = http.match(() => true).filter((req) => !req.request.url.endsWith('/stream'));
      const lists = pending.filter((req) => req.request.url === `${API_BASE_URL}/products` && !req.cancelled);
      const styles = lists.at(-1)?.request.params.get('styles') ?? null;
      for (const req of pending) {
        if (!req.cancelled) req.flush(req.request.url === `${API_BASE_URL}/products` ? EMPTY_PAGE : []);
      }
      await fixture.whenStable();
      return styles;
    }

    beforeEach(async () => {
      // Lo que deja el buscador del home: "Todos" + estilos de fragancias.
      (component as unknown as { applySnapshot(s: ProductsFiltersSnapshot): void }).applySnapshot({
        ...DEFAULT_PRODUCTS_FILTERS,
        styles: ['amaderado', 'gourmand'],
      });
      TestBed.tick();
      const http = TestBed.inject(HttpTestingController);
      for (const req of http.match(() => true)) {
        if (!req.cancelled) req.flush(req.request.url === `${API_BASE_URL}/products` ? EMPTY_PAGE : []);
      }
      await fixture.whenStable();
    });

    it('se mantienen al pasar a perfumes y entre perfumes y decants', async () => {
      expect(await selectCategory('perfumes')).toBe('amaderado,gourmand');
      expect(await selectCategory('decants')).toBe('amaderado,gourmand');
      expect(await selectCategory('perfumes')).toBe('amaderado,gourmand');
    });

    it('se reinician al pasar a vapes o esencias', async () => {
      expect(await selectCategory('perfumes')).toBe('amaderado,gourmand');
      expect(await selectCategory('vapes')).toBeNull();
    });

    it('también si se va directo de "Todos" a esencias', async () => {
      expect(await selectCategory('esencias')).toBeNull();
    });
  });

  // Ej. "Perfumes" en el footer estando ya en /productos: el link no navega (misma URL), así que
  // la página tiene que aplicar la categoría sola.
  it('con la página abierta, una categoría elegida desde afuera se aplica en el momento', async () => {
    TestBed.inject(ProductsFiltersStore).showCategory('perfumes');
    TestBed.tick();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${API_BASE_URL}/products/brands?category=perfumes`).flush([]);
    http.expectOne(`${API_BASE_URL}/products/capacities?category=perfumes`).flush([]);
    const list = http.expectOne((req) => req.url === `${API_BASE_URL}/products`);
    expect(list.request.params.get('category')).toBe('perfumes');
    list.flush(EMPTY_PAGE);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.products-empty-title')?.textContent).toContain('fragancias');
  });
});

/** El camino real del buscador del home: escribe los filtros y el catálogo los lee al crearse. */
describe('Products - entrando desde el buscador "Encontrá tu esencia"', () => {
  beforeEach(() => {
    sessionStorage.setItem(
      'ev:products-filters',
      JSON.stringify({ ...DEFAULT_PRODUCTS_FILTERS, styles: ['amaderado', 'gourmand'] }),
    );
    TestBed.configureTestingModule({
      imports: [Products],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.removeItem('ev:products-filters');
  });

  it('al pasar de "Todos" a perfumes los estilos elegidos siguen aplicados', async () => {
    const fixture = TestBed.createComponent(Products);
    const http = TestBed.inject(HttpTestingController);
    const flushPending = () => {
      for (const req of http.match(() => true)) {
        if (!req.cancelled) req.flush(req.request.url === `${API_BASE_URL}/products` ? EMPTY_PAGE : []);
      }
    };
    TestBed.tick();
    flushPending();
    await fixture.whenStable();

    (fixture.componentInstance as unknown as { activeCategory: WritableSignal<string> }).activeCategory.set('perfumes');
    TestBed.tick();
    const list = http
      .match((req) => req.url === `${API_BASE_URL}/products`)
      .filter((req) => !req.cancelled)
      .at(-1);

    expect(list?.request.params.get('category')).toBe('perfumes');
    expect(list?.request.params.get('styles')).toBe('amaderado,gourmand');
    // Se responde lo pendiente para que `verify()` confirme que no quedó nada abierto.
    flushPending();
  });
});
