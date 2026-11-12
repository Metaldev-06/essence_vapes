import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input, linkedSignal } from '@angular/core';
import { cloudinaryUrl } from '../../../../data/cloudinary-url.helper';
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

  /** `f_auto,q_auto,w_800` - this is the LCP candidate on the product detail page (confirmed in
   *  the performance audit, 2026-11-11), so it gets the largest width of any image in the app,
   *  not the smallest. The "ampliar imagen" link keeps `image.url` untouched - that one should
   *  open the real full-resolution original. Called directly in the template (not a `computed()`)
   *  since it needs to stay correlated with the same `image` the `@if`/`as` block already
   *  narrowed to non-null, instead of a separately-nullable signal. */
  protected mainImageUrl(url: string): string {
    return cloudinaryUrl(url, 800);
  }

  protected thumbUrl(url: string): string {
    return cloudinaryUrl(url, 128);
  }

  protected selectImage(index: number): void {
    this.activeImageIndex.set(index);
  }
}
