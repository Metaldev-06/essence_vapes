import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { AuthService } from './auth.service';

/**
 * Keeps already-logged-in customers off `/auth/login` and `/auth/register`.
 * Waits for the startup session restore to settle before deciding, so a
 * returning customer isn't briefly treated as a guest while `/auth/me` resolves.
 */
export const guestOnlyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.isRestoring).pipe(
    filter((restoring) => !restoring),
    take(1),
    map(() => (authService.isAuthenticated() ? router.createUrlTree(['/']) : true)),
  );
};
