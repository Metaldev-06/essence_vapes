import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import type { Breadcrumb } from './breadcrumb.model';

/** Breadcrumb reutilizable del admin - lee `data.breadcrumbs` de la ruta hoja activa
 *  (`admin.routes.ts`). "Dashboard" como raíz es siempre implícito. */
@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.css',
})
export class Breadcrumbs {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // Arranca vacío a propósito - NO se puede calcular en este mismo instante de construcción:
  // `Breadcrumbs` se crea como parte de la navegación inicial a `/admin`, y en ese momento
  // `router.routerState.root.snapshot` todavía puede ser `undefined` (el Router todavía no
  // terminó de resolver esa primera navegación) - leerlo acá tiraba
  // "Cannot read properties of undefined (reading 'data')" y rompía el bootstrap entero.
  // El primer `NavigationEnd` (que ya está en curso) lo completa un instante después.
  protected readonly trail = signal<readonly Breadcrumb[]>([]);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.trail.set(this.readTrail()));
  }

  private readTrail(): readonly Breadcrumb[] {
    let route = this.router.routerState.root;
    while (route.firstChild) route = route.firstChild;
    return (route.snapshot?.data['breadcrumbs'] as readonly Breadcrumb[] | undefined) ?? [];
  }
}
