import { HttpClient, HttpErrorResponse, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api.config';
import { MAX_RATE_LIMIT_RETRIES, rateLimitInterceptor, retryAfterMs } from './rate-limit.interceptor';
import { DEFAULT_RATE_LIMIT_WAIT_MS, RateLimitService } from './rate-limit.service';

const STORAGE_KEY = 'ev:rate-limit';
const PRODUCTS = `${API_BASE_URL}/products`;
const START = Date.UTC(2026, 10, 14, 23, 33, 47);

const tooManyRequests = (retryAfterSeconds: number | null = 42) => ({
  body: { statusCode: 429, message: 'Hiciste muchas solicitudes', retryAfterSeconds },
  init: { status: 429, statusText: 'Too Many Requests' },
});

describe('retryAfterMs', () => {
  const error = (body: unknown, headers: Record<string, string> = {}) =>
    new HttpErrorResponse({ status: 429, error: body, headers: new HttpHeaders(headers) });

  it('usa los segundos que informa el backend en el cuerpo', () => {
    expect(retryAfterMs(error({ retryAfterSeconds: 42 }))).toBe(42_000);
  });

  it('si no vienen en el cuerpo, usa el header Retry-After (segundos o fecha)', () => {
    expect(retryAfterMs(error(null, { 'Retry-After': '17' }))).toBe(17_000);
    expect(retryAfterMs(error(null, { 'Retry-After': new Date(START + 30_000).toUTCString() }), START)).toBe(30_000);
  });

  it('sin ningún dato, espera un minuto', () => {
    expect(retryAfterMs(error({ retryAfterSeconds: null }))).toBe(DEFAULT_RATE_LIMIT_WAIT_MS);
  });
});

describe('rateLimitInterceptor + RateLimitService', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([rateLimitInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    localStorage.removeItem(STORAGE_KEY);
  });

  afterEach(() => {
    backend?.verify();
    vi.useRealTimers();
    localStorage.removeItem(STORAGE_KEY);
  });

  it('ante un 429 muestra la espera real y, al llegar a 0, reintenta el pedido y entrega la respuesta', () => {
    setup();
    const service = TestBed.inject(RateLimitService);
    const received: unknown[] = [];
    http.get(PRODUCTS).subscribe((data) => received.push(data));

    const { body, init } = tooManyRequests(42);
    backend.expectOne(PRODUCTS).flush(body, init);

    expect(service.isBlocked()).toBe(true);
    expect(service.remainingSeconds()).toBe(42);

    vi.advanceTimersByTime(20_000);
    expect(service.remainingSeconds()).toBe(22);
    backend.expectNone(PRODUCTS);

    vi.advanceTimersByTime(22_000);
    expect(service.isBlocked()).toBe(false);
    backend.expectOne(PRODUCTS).flush({ data: ['ok'] });

    expect(received).toEqual([{ data: ['ok'] }]);
  });

  it('al recargar la página la cuenta sigue donde estaba, no vuelve a empezar', () => {
    setup();
    http.get(PRODUCTS).subscribe({ error: () => undefined });
    const { body, init } = tooManyRequests(60);
    backend.expectOne(PRODUCTS).flush(body, init);
    vi.advanceTimersByTime(25_000);

    // "Recargar": se descarta todo y la app arranca de cero, solo queda localStorage.
    TestBed.resetTestingModule();
    setup();
    const afterReload = TestBed.inject(RateLimitService);

    expect(afterReload.isBlocked()).toBe(true);
    expect(afterReload.remainingSeconds()).toBe(35);
  });

  it('mientras dura la espera, los pedidos nuevos se retienen y salen al terminar', () => {
    setup();
    TestBed.inject(RateLimitService).block(10_000);

    const received: unknown[] = [];
    http.get(`${PRODUCTS}/brands`).subscribe((data) => received.push(data));
    backend.expectNone(`${PRODUCTS}/brands`);

    vi.advanceTimersByTime(10_000);
    backend.expectOne(`${PRODUCTS}/brands`).flush(['Valentino']);

    expect(received).toEqual([['Valentino']]);
  });

  it('una espera ya vencida al cargar la página no bloquea nada', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ until: START - 1_000, startedAt: START - 61_000 }));
    setup();

    expect(TestBed.inject(RateLimitService).isBlocked()).toBe(false);
    http.get(PRODUCTS).subscribe();
    backend.expectOne(PRODUCTS).flush({});
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it(`después de ${MAX_RATE_LIMIT_RETRIES} reintentos con 429, el error le llega a la pantalla`, () => {
    setup();
    let failure: HttpErrorResponse | undefined;
    http.get(PRODUCTS).subscribe({ error: (error: HttpErrorResponse) => (failure = error) });

    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
      const { body, init } = tooManyRequests(5);
      backend.expectOne(PRODUCTS).flush(body, init);
      vi.advanceTimersByTime(5_000);
    }

    expect(failure?.status).toBe(429);
    backend.expectNone(PRODUCTS);
  });

  it('otros errores pasan de largo, sin espera', () => {
    setup();
    let failure: HttpErrorResponse | undefined;
    http.get(PRODUCTS).subscribe({ error: (error: HttpErrorResponse) => (failure = error) });

    backend.expectOne(PRODUCTS).flush({ message: 'caído' }, { status: 503, statusText: 'Service Unavailable' });

    expect(failure?.status).toBe(503);
    expect(TestBed.inject(RateLimitService).isBlocked()).toBe(false);
  });

  it('no toca pedidos a otros dominios (ej. Cloudinary)', () => {
    setup();
    TestBed.inject(RateLimitService).block(30_000);

    http.get('https://res.cloudinary.com/demo/image.json').subscribe();

    backend.expectOne('https://res.cloudinary.com/demo/image.json').flush({});
  });
});
