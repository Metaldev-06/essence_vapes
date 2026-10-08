import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { AdminAuthService } from './admin-auth.service';

/** Keeps an already-logged-in admin off `/admin/login`, same idea as the storefront's `guestOnlyGuard`. */
export const adminGuestOnlyGuard: CanActivateFn = () => {
  const adminAuthService = inject(AdminAuthService);
  const router = inject(Router);

  return toObservable(adminAuthService.isRestoring).pipe(
    filter((restoring) => !restoring),
    take(1),
    map(() => (adminAuthService.isAuthenticated() ? router.createUrlTree(['/admin']) : true)),
  );
};
