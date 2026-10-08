import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Keeps guests off customer-only pages (favorites, and future ones like orders/account).
 * Mirrors `guestOnlyGuard`'s wait for the startup session restore to settle before deciding,
 * so a returning customer isn't bounced to login while `/auth/me` is still resolving.
 */
export const authOnlyGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.isRestoring).pipe(
    filter((restoring) => !restoring),
    take(1),
    map(() =>
      authService.isAuthenticated()
        ? true
        : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};
