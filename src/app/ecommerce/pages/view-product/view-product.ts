import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ProductsService } from '../../data/products.service';
import { CATEGORY_LABELS, type Product } from '../../data/product.model';
import { ProductGallery } from './components/product-gallery/product-gallery';
import { ProductDetails } from './components/product-details/product-details';
import { FragranceProfile } from './components/fragrance-profile/fragrance-profile';
import { UsageGuide } from './components/usage-guide/usage-guide';
import { ProductPerformance } from './components/product-performance/product-performance';
import { RelatedProducts } from './components/related-products/related-products';
import { ProductViewSkeleton } from './components/product-view-skeleton/product-view-skeleton';

@Component({
  selector: 'app-view-product',
  imports: [
    RouterLink,
    ProductGallery,
    ProductDetails,
    FragranceProfile,
    UsageGuide,
    ProductPerformance,
    RelatedProducts,
    ProductViewSkeleton,
  ],
  templateUrl: './view-product.html',
  styleUrl: './view-product.css',
})
export default class ViewProduct {
  private readonly productsService = inject(ProductsService);
  private readonly titleService = inject(Title);

  readonly id = input('');
  /** Which variant to preselect, from `?variant=` - e.g. coming from a catalog card. */
  readonly variant = input('');

  protected readonly categoryLabels = CATEGORY_LABELS;

  private readonly productResource = this.productsService.byId(this.id);
  /** `value()` throws while the resource is in an error state (e.g. 404), so guard it with `hasValue()`. */
  protected readonly product = computed(() =>
    this.productResource.hasValue() ? this.productResource.value() : undefined,
  );
  protected readonly isLoading = this.productResource.isLoading;

  /** Two-way bound with `ProductDetails`, so switching a pill there also swaps the gallery photo. */
  protected readonly selectedVariantId = signal('');

  /**
   * Same product, with `images` swapped for the selected variant's own, if it has any. Kept as a
   * `computed()` (not a plain method call from the template) so its reference stays stable across
   * change-detection runs - `ProductGallery` resets its active photo index whenever this changes.
   */
  protected readonly effectiveProduct = computed<Product | undefined>(() => {
    const product = this.product();
    if (!product) return undefined;
    const variant = product.variants.find(
      (candidate) => candidate.id === this.selectedVariantId(),
    );
    if (!variant || variant.images.length === 0) return product;
    return { ...product, images: variant.images };
  });

  private readonly relatedResource = this.productsService.list(() => {
    const current = this.product();
    return current ? { category: current.category, limit: 5 } : undefined;
  });

  protected readonly hasUsageGuide = computed(() => {
    const product = this.product();
    return Boolean(product?.mood || product?.seasonUsage || product?.dayUsage || product?.occasions);
  });

  protected readonly hasPerformance = computed(() => {
    const product = this.product();
    return Boolean(product?.sillage || product?.longevity);
  });

  protected readonly relatedProducts = computed(() => {
    const current = this.product();
    if (!current) {
      return [];
    }
    return this.relatedResource
      .value()
      .data.filter((item) => item.id !== current.id)
      .slice(0, 4);
  });

  constructor() {
    effect(() => {
      const product = this.product();
      this.titleService.setTitle(product ? `${product.name} | Essence Vapes` : 'Producto | Essence Vapes');
    });

    // Seeds the selected variant from the `?variant=` query param once the product loads, falling
    // back to its base variant when that id doesn't (or no longer) match one of its variants.
    effect(() => {
      const product = this.product();
      if (!product) return;
      const requested = this.variant();
      const valid = product.variants.some((candidate) => candidate.id === requested);
      this.selectedVariantId.set(valid ? requested : product.variantId);
    });
  }
}
