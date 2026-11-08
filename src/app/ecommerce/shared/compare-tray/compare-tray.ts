import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { CompareService } from '../../../core/compare/compare.service';
import type { Product } from '../../data/product.model';

/**
 * Global floating bar (mounted once in the app shell) that shows the current comparison list -
 * hidden on `/comparar` itself, which already has its own fixed comparator bar with the same
 * remove/vaciar/comparar controls (showing both would be a redundant duplicate).
 */
@Component({
  selector: 'app-compare-tray',
  imports: [RouterLink],
  templateUrl: './compare-tray.html',
  styleUrl: './compare-tray.css',
})
export class CompareTray {
  protected readonly compareService = inject(CompareService);
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { requireSync: true },
  );

  protected readonly isOnComparePage = computed(() => this.currentUrl().startsWith('/comparar'));

  protected remove(product: Product): void {
    this.compareService.remove(product.id, product.variantId);
  }
}
