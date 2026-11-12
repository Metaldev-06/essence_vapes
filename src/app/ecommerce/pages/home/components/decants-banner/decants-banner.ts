import { NgOptimizedImage } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DEFAULT_PRODUCTS_FILTERS, ProductsFiltersStore } from '../../../../data/products-filters-store';

/** One real product photo per decant size, shown in the visual side - swaps with the size pill. */
const SIZE_PHOTOS: Record<number, string> = {
  2: 'images/decants/2ml.png',
  5: 'images/decants/5ml.png',
  10: 'images/decants/10ml.png',
};

/** Which way a photo slides - `'next'` = toward a larger size (right-to-left), `'prev'` = toward
 *  a smaller one (left-to-right). `null` only for the very first photo (no entrance to animate). */
type SlideDirection = 'next' | 'prev' | null;

interface PhotoLayer {
  readonly id: number;
  readonly size: number;
  readonly url: string;
  readonly dir: SlideDirection;
}

@Component({
  selector: 'app-decants-banner',
  imports: [NgOptimizedImage],
  templateUrl: './decants-banner.html',
  styleUrl: './decants-banner.css',
})
export class DecantsBanner {
  private readonly router = inject(Router);
  private readonly filtersStore = inject(ProductsFiltersStore);

  protected readonly sizes: readonly number[] = [2, 5, 10];

  protected readonly selectedSize = signal(this.sizes[0]);

  /**
   * Two layers instead of a single swapped `<img>` - a plain `[ngSrc]`/class swap on the same
   * persistent element can't replay a CSS animation reliably (two same-direction picks in a row
   * wouldn't retrigger it). Each layer is rendered through a single-item `@for` keyed by a unique
   * `id`, so Angular always destroys and recreates the DOM node on a change - a fresh element
   * always plays its entrance/exit animation from scratch. `exitingLayers` holds the outgoing
   * photo only for the duration of its slide-out animation (removed in `onExitAnimationEnd`).
   */
  private layerIdCounter = 0;
  protected readonly currentLayers = signal<readonly PhotoLayer[]>([
    { id: this.layerIdCounter, size: this.sizes[0], url: SIZE_PHOTOS[this.sizes[0]], dir: null },
  ]);
  protected readonly exitingLayers = signal<readonly PhotoLayer[]>([]);

  protected selectSize(ml: number): void {
    const current = this.selectedSize();
    if (ml === current) return;

    const dir: SlideDirection = this.sizes.indexOf(ml) > this.sizes.indexOf(current) ? 'next' : 'prev';

    this.exitingLayers.set(this.currentLayers().map((layer) => ({ ...layer, dir })));
    this.currentLayers.set([{ id: ++this.layerIdCounter, size: ml, url: SIZE_PHOTOS[ml], dir }]);
    this.selectedSize.set(ml);
  }

  /** The outgoing photo's slide-out animation finished - safe to remove it now. */
  protected onExitAnimationEnd(): void {
    this.exitingLayers.set([]);
  }

  /**
   * Jumps straight into Productos filtered to decants + the chosen size - written to
   * sessionStorage (see `ProductsFiltersStore`), never as a query param in the URL.
   */
  protected goToDecants(): void {
    this.filtersStore.write({
      ...DEFAULT_PRODUCTS_FILTERS,
      category: 'decants',
      capacityMl: this.selectedSize(),
    });
    void this.router.navigateByUrl('/productos');
  }
}
