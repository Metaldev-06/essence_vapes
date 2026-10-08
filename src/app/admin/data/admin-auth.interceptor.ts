import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';
import { IS_ADMIN_REQUEST } from '../../core/auth/admin-request.context';
import { AdminAuthService } from './admin-auth.service';

/**
 * Attaches the admin session's bearer token to every request tagged with `IS_ADMIN_REQUEST`,
 * and clears that session if the API ever rejects it as unauthorized. Mirrors `authInterceptor`
 * but only ever acts on admin-tagged requests - everything else is `authInterceptor`'s.
 */
export const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL) || !req.context.get(IS_ADMIN_REQUEST)) {
    return next(req);
  }

  const adminAuthService = inject(AdminAuthService);
  const token = adminAuthService.token();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (token && error instanceof HttpErrorResponse && error.status === 401) {
        adminAuthService.logout();
      }
      return throwError(() => error);
    }),
  );
};
