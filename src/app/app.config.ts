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
import { AdminExcludedPreloadingStrategy } from './core/routing/admin-excluded-preloading-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor, adminAuthInterceptor])),
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
