import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withPreloading,
  withViewTransitions,
} from '@angular/router';

import { routes } from './app.routes';
import { adminAuthInterceptor } from './admin/data/admin-auth.interceptor';
import { authInterceptor } from './core/auth/auth.interceptor';
import { rateLimitInterceptor } from './core/http/rate-limit.interceptor';
import { AdminExcludedPreloadingStrategy } from './core/routing/admin-excluded-preloading-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // `rateLimitInterceptor` primero: cuando reintenta un pedido tras un 429, el reintento vuelve
    // a pasar por los de autenticación y sale con el token vigente.
    provideHttpClient(withInterceptors([rateLimitInterceptor, authInterceptor, adminAuthInterceptor])),
    provideRouter(
      routes,
      withViewTransitions(),
      withPreloading(AdminExcludedPreloadingStrategy),
      withComponentInputBinding(),
      // Al navegar a una ruta nueva arranca arriba del todo; al volver atrás/adelante con el
      // botón del navegador, restaura la posición de scroll que tenía esa página.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
  ],
};
