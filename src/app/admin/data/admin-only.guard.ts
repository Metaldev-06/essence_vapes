import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { AdminAuthService } from './admin-auth.service';

/**
 * Keeps non-admins off the admin panel. Mirrors the storefront's `authOnlyGuard`: waits for the
 * startup session restore to settle before deciding, so a returning admin isn't bounced to
 * login while `/auth/me` is still resolving.
 */
export const adminOnlyGuard: CanActivateFn = (_route, state) => {
  const adminAuthService = inject(AdminAuthService);
  const router = inject(Router);

  return toObservable(adminAuthService.isRestoring).pipe(
    filter((restoring) => !restoring),
    take(1),
    map(() =>
      adminAuthService.isAuthenticated()
        ? true
        : router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } }),
    ),
  );
};
