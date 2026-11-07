import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input, linkedSignal } from '@angular/core';
import type { Product } from '../../../../data/product.model';

@Component({
  selector: 'app-product-gallery',
  imports: [NgOptimizedImage],
  templateUrl: './product-gallery.html',
  styleUrl: './product-gallery.css',
})
export class ProductGallery {
  readonly product = input.required<Product>();

  /** Resets to the first photo whenever the product changes (e.g. navigating via "related products"). */
  protected readonly activeImageIndex = linkedSignal(() => {
    this.product();
    return 0;
  });

  /** Currently shown photo, if the product has any - falls back to the decorative SVG bottle otherwise. */
  protected readonly activeImage = computed(() => this.product().images[this.activeImageIndex()]);

  protected selectImage(index: number): void {
    this.activeImageIndex.set(index);
  }
}
