import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../../core/config/api.config';
import { ProductsFiltersStore } from '../../data/products-filters-store';
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
