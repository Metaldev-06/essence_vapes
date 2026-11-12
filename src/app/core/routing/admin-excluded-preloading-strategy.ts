import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

/**
 * Same as `PreloadAllModules` except it never preloads the admin panel - anonymous storefront
 * visitors were downloading the whole `/admin` bundle (confirmed ~50kB transfer in the
 * performance audit, 2026-11-11 - see `02-frontend-performance.md`) on every visit, even though
 * they never open it. Blocking preload on the top-level `admin` route is enough: its nested lazy
 * routes never get a chance to preload either, since that only happens after the parent's own
 * `loadChildren` has already resolved.
 */
@Injectable({ providedIn: 'root' })
export class AdminExcludedPreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.path === 'admin') return of(null);
    return load();
  }
}
