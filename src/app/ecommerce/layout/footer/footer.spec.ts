import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { API_BASE_URL } from '../../../core/config/api.config';
import { DEFAULT_PRODUCTS_FILTERS, ProductsFiltersStore } from '../../data/products-filters-store';
import { Footer } from './footer';

@Component({ template: '' })
class CatalogStub {}

async function render(): Promise<HTMLElement> {
  sessionStorage.clear();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'productos', component: CatalogStub }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const fixture = TestBed.createComponent(Footer);
  TestBed.tick();
  TestBed.inject(HttpTestingController).match(`${API_BASE_URL}/legal/info`).forEach((req) => req.flush({}));
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function categoryLink(element: HTMLElement, label: string): HTMLAnchorElement {
  const link = Array.from(element.querySelectorAll<HTMLAnchorElement>('a')).find(
    (anchor) => anchor.textContent?.trim() === label,
  );
  if (!link) throw new Error(`No se encontró el link "${label}"`);
  return link;
}

describe('Footer - links de categorías', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  it('apuntan a /productos, sin el ?cat= que el catálogo ignoraba', async () => {
    const element = await render();

    expect(categoryLink(element, 'Perfumes').getAttribute('href')).toBe('/productos');
  });

  it('al tocar una categoría, el catálogo abre con esa categoría elegida', async () => {
    const element = await render();

    categoryLink(element, 'Vapes').click();

    expect(TestBed.inject(ProductsFiltersStore).read()).toEqual({ ...DEFAULT_PRODUCTS_FILTERS, category: 'vapes' });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/productos'));
  });

  it('Ctrl+click (abrir en otra pestaña) no cambia los filtros de esta pestaña', async () => {
    const element = await render();

    categoryLink(element, 'Perfumes').dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true }),
    );

    expect(TestBed.inject(ProductsFiltersStore).read()).toEqual(DEFAULT_PRODUCTS_FILTERS);
  });
});
