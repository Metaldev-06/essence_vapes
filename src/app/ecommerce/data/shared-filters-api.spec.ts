import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api.config';
import { OPTIONAL_REQUEST } from '../../core/http/rate-limit.interceptor';
import { DEFAULT_PRODUCTS_FILTERS, type ProductsFiltersSnapshot } from './products-filters-store';
import { SharedFiltersApi } from './shared-filters-api';

const URL_BASE = `${API_BASE_URL}/shared-filters`;
const FILTERS: ProductsFiltersSnapshot = {
  ...DEFAULT_PRODUCTS_FILTERS,
  category: 'perfumes',
  brand: 'Jean Paul Gaultier',
  styles: ['tropical', 'amaderado'],
};

describe('SharedFiltersApi', () => {
  let api: SharedFiltersApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(SharedFiltersApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide el código una sola vez por combinación de filtros', async () => {
    const first = api.codeFor(FILTERS);
    const second = api.codeFor({ ...FILTERS, styles: ['amaderado', 'tropical'] });

    http.expectOne({ method: 'POST', url: URL_BASE }).flush({ code: 'k7Qx2m' });

    await expect(first).resolves.toBe('k7Qx2m');
    await expect(second).resolves.toBe('k7Qx2m');
    expect(api.peekCode(FILTERS)).toBe('k7Qx2m');
  });

  it('antes de que llegue, peekCode no tiene nada', () => {
    void api.codeFor(FILTERS);
    expect(api.peekCode(FILTERS)).toBeUndefined();
    http.expectOne({ method: 'POST', url: URL_BASE }).flush({ code: 'k7Qx2m' });
  });

  it('si falla, el próximo intento lo vuelve a pedir', async () => {
    const failed = api.codeFor(FILTERS);
    http.expectOne({ method: 'POST', url: URL_BASE }).flush('caído', { status: 503, statusText: 'Service Unavailable' });
    await expect(failed).rejects.toBeTruthy();

    const retry = api.codeFor(FILTERS);
    http.expectOne({ method: 'POST', url: URL_BASE }).flush({ code: 'k7Qx2m' });
    await expect(retry).resolves.toBe('k7Qx2m');
  });

  it('resolve devuelve los filtros del código, ya validados', async () => {
    const pending = api.resolve('k7Qx2m');
    http.expectOne(`${URL_BASE}/k7Qx2m`).flush({ ...FILTERS, gender: 'robot', styles: ['tropical', 'mentolado'] });

    await expect(pending).resolves.toEqual({ ...FILTERS, styles: ['tropical'] });
  });

  it('un código con formato inválido no llega al servidor', async () => {
    await expect(api.resolve("x'; DROP")).resolves.toBeNull();
    http.expectNone(() => true);
  });

  it('los dos pedidos van marcados como prescindibles (un 429 no pausa la tienda)', () => {
    void api.codeFor(FILTERS);
    void api.resolve('k7Qx2m');

    const create = http.expectOne({ method: 'POST', url: URL_BASE });
    const lookup = http.expectOne(`${URL_BASE}/k7Qx2m`);
    expect(create.request.context.get(OPTIONAL_REQUEST)).toBe(true);
    expect(lookup.request.context.get(OPTIONAL_REQUEST)).toBe(true);
    create.flush({ code: 'k7Qx2m' });
    lookup.flush({});
  });

  it('un código inexistente devuelve null', async () => {
    const pending = api.resolve('noExiste');
    http.expectOne(`${URL_BASE}/noExiste`).flush({}, { status: 404, statusText: 'Not Found' });

    await expect(pending).resolves.toBeNull();
  });
});
