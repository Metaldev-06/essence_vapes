import { HttpErrorResponse, type HttpEvent, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { type Observable, catchError, switchMap, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { DEFAULT_RATE_LIMIT_WAIT_MS, RateLimitService } from './rate-limit.service';

/** Cuántas veces se reintenta un mismo pedido que recibe 429. Después, el error le llega a la
 *  pantalla que lo hizo, como cualquier otro. */
export const MAX_RATE_LIMIT_RETRIES = 3;

/**
 * Cuánto esperar según la respuesta 429. Primero `retryAfterSeconds` del cuerpo (lo agrega el
 * filtro global del backend), después el header `Retry-After` (segundos o fecha HTTP), y si no
 * hay ninguno, un minuto.
 */
export function retryAfterMs(error: HttpErrorResponse, now = Date.now()): number {
  const body = error.error as { retryAfterSeconds?: unknown } | null;
  const fromBody = Number(body?.retryAfterSeconds);
  if (body?.retryAfterSeconds != null && Number.isFinite(fromBody) && fromBody > 0) return fromBody * 1000;

  const header = error.headers?.get('Retry-After');
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    const date = Date.parse(header);
    if (!Number.isNaN(date) && date > now) return date - now;
  }
  return DEFAULT_RATE_LIMIT_WAIT_MS;
}

/**
 * Límite de solicitudes (HTTP 429) de la API:
 * - Si hay una espera en curso (aunque venga de antes de recargar la página), el pedido se
 *   retiene hasta que termine - enviarlo igual solo recibiría otro 429.
 * - Si el pedido recibe 429, se activa la espera con el tiempo que informa el servidor (se ve en
 *   `RateLimitModal`) y, al terminar, se REINTENTA el mismo pedido: la pantalla que lo hizo
 *   recibe su respuesta como si nada.
 *
 * Va PRIMERO en la cadena de interceptores: así cada reintento vuelve a pasar por los de
 * autenticación y sale con el token vigente en ese momento.
 */
export const rateLimitInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) return next(req);
  const rateLimit = inject(RateLimitService);

  const attempt = (retriesLeft: number): Observable<HttpEvent<unknown>> =>
    rateLimit.whenAvailable().pipe(
      switchMap(() => next(req)),
      catchError((error: unknown) => {
        if (!(error instanceof HttpErrorResponse) || error.status !== 429 || retriesLeft <= 0) {
          return throwError(() => error);
        }
        rateLimit.block(retryAfterMs(error));
        return attempt(retriesLeft - 1);
      }),
    );

  return attempt(MAX_RATE_LIMIT_RETRIES);
};
