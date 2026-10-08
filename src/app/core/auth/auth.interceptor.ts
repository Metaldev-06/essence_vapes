import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { IS_ADMIN_REQUEST } from './admin-request.context';
import { AuthService } from './auth.service';

/**
 * Attaches the storefront session's bearer token to every request to our own API,
 * and clears the session if the API ever rejects that token as unauthorized.
 * Skips anything tagged for the admin panel - that's `adminAuthInterceptor`'s request.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL) || req.context.get(IS_ADMIN_REQUEST)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.token();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (token && error instanceof HttpErrorResponse && error.status === 401) {
        authService.logout();
      }
      return throwError(() => error);
    }),
  );
};
