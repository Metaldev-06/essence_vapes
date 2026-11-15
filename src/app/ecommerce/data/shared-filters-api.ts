import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';
import { OPTIONAL_REQUEST } from '../../core/http/rate-limit.interceptor';
import type { ProductsFiltersSnapshot } from './products-filters-store';
import {
  SHARE_CODE_PARAM,
  filtersToShareParams,
  isShareCode,
  sanitizeFilters,
  type RawFilters,
} from './shared-filters';

/** Un link para compartir no puede dejar colgada la página: pasado esto, sigue sin él. */
const REQUEST_TIMEOUT_MS = 5000;

/** Ambos pedidos tienen plan B (link largo / catálogo sin esos filtros): si la ruta llega a su
 *  límite (429), no se pausa toda la tienda por ellos. */
const optionalRequest = () => new HttpContext().set(OPTIONAL_REQUEST, true);

/**
 * Links cortos para compartir filtros: `POST /shared-filters` guarda los filtros y devuelve un
 * código (`/productos?c=k7Qx2m`); `GET /shared-filters/:code` los devuelve.
 *
 * Los códigos se recuerdan en memoria por combinación de filtros, así el botón Compartir puede
 * pedirlo por adelantado (al pasar el mouse o empezar a tocarlo) y abrir el menú de compartir
 * del celular sin esperar al servidor: el navegador solo lo permite inmediatamente después de un
 * toque.
 */
@Service()
export class SharedFiltersApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/shared-filters`;
  private readonly codes = new Map<string, Promise<string>>();
  private readonly resolvedCodes = new Map<string, string>();

  /** El código de estos filtros (uno solo pedido al servidor por combinación). */
  codeFor(filters: ProductsFiltersSnapshot): Promise<string> {
    const key = this.keyFor(filters);
    let pending = this.codes.get(key);
    if (!pending) {
      pending = firstValueFrom(
        this.http
          .post<{ code: string }>(this.baseUrl, filters, { context: optionalRequest() })
          .pipe(timeout(REQUEST_TIMEOUT_MS)),
      ).then(({ code }) => {
        this.resolvedCodes.set(key, code);
        return code;
      });
      // Si falla, se olvida: el próximo intento lo vuelve a pedir.
      pending.catch(() => this.codes.delete(key));
      this.codes.set(key, pending);
    }
    return pending;
  }

  /** El código si ya llegó, sin esperar. */
  peekCode(filters: ProductsFiltersSnapshot): string | undefined {
    return this.resolvedCodes.get(this.keyFor(filters));
  }

  /** Los filtros de un código, ya validados; `null` si no existe o el servidor no respondió. */
  async resolve(code: string): Promise<ProductsFiltersSnapshot | null> {
    if (!isShareCode(code)) return null;
    try {
      const raw = await firstValueFrom(
        this.http
          .get<RawFilters>(`${this.baseUrl}/${code}`, { context: optionalRequest() })
          .pipe(timeout(REQUEST_TIMEOUT_MS)),
      );
      return sanitizeFilters(raw);
    } catch {
      return null;
    }
  }

  private keyFor(filters: ProductsFiltersSnapshot): string {
    return JSON.stringify(filtersToShareParams({ ...filters, styles: [...filters.styles].sort() }));
  }
}

/**
 * En `/productos`: si se entra con `?c=<código>`, trae los filtros ANTES de mostrar el catálogo,
 * así abre directamente con ellos (sin cargar primero la lista sin filtrar). Sin código, no hace
 * nada. Si el código no existe, el catálogo abre como siempre.
 */
export const sharedFiltersResolver: ResolveFn<ProductsFiltersSnapshot | null> = (route) => {
  const code = route.queryParamMap.get(SHARE_CODE_PARAM);
  return code ? inject(SharedFiltersApi).resolve(code) : null;
};
