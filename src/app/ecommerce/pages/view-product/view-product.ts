import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { SeoService } from '../../../core/seo/seo.service';
import { ProductsService } from '../../data/products.service';
import { CATEGORY_LABELS, type Product } from '../../data/product.model';
import { ProductGallery } from './components/product-gallery/product-gallery';
import { ProductDetails } from './components/product-details/product-details';
import { AccordsBand } from './components/accords-band/accords-band';
import { FragranceProfile } from './components/fragrance-profile/fragrance-profile';
import { UsageGuide } from './components/usage-guide/usage-guide';
import { RelatedProducts } from './components/related-products/related-products';
import { ProductViewSkeleton } from './components/product-view-skeleton/product-view-skeleton';

@Component({
  selector: 'app-view-product',
  imports: [
    RouterLink,
    ProductGallery,
    ProductDetails,
    AccordsBand,
    FragranceProfile,
    UsageGuide,
    RelatedProducts,
    ProductViewSkeleton,
  ],
  templateUrl: './view-product.html',
  styleUrl: './view-product.css',
})
export default class ViewProduct {
  private readonly productsService = inject(ProductsService);
  private readonly titleService = inject(Title);
  private readonly seoService = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

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
   * Same product, with `variantId` pointed at the selected variant (so `ProductGallery`
   * favorites the right one, not always the base) and `images` swapped for that variant's own,
   * if it has any. Kept as a `computed()` (not a plain method call from the template) so its
   * reference stays stable across change-detection runs - `ProductGallery` resets its active
   * photo index whenever this changes.
   */
  protected readonly effectiveProduct = computed<Product | undefined>(() => {
    const product = this.product();
    if (!product) return undefined;
    const variant = product.variants.find(
      (candidate) => candidate.id === this.selectedVariantId(),
    );
    if (!variant) return product;
    return {
      ...product,
      variantId: variant.id,
      images: variant.images.length > 0 ? variant.images : product.images,
    };
  });

  private readonly relatedResource = this.productsService.list(() => {
    const current = this.product();
    return current ? { category: current.category, limit: 5 } : undefined;
  });

  protected readonly hasUsageGuide = computed(() => {
    const product = this.product();
    return Boolean(
      product?.mood ||
        product?.seasonUsage ||
        product?.dayUsage ||
        product?.occasions ||
        product?.sillage ||
        product?.longevity,
    );
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

    // Schema.org Product+Offer con datos reales del recurso ya cargado - nunca precio, stock
    // ni rating inventados. `null` mientras no haya producto limpia cualquier JSON-LD previo.
    effect(() => {
      const product = this.product();
      this.seoService.setStructuredData(
        product
          ? {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: product.name,
              brand: { '@type': 'Brand', name: product.brand },
              description: product.subtitle,
              ...(product.rating
                ? {
                    aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: product.rating,
                      reviewCount: product.ratingCount ?? 1,
                    },
                  }
                : {}),
              offers: {
                '@type': 'Offer',
                priceCurrency: 'ARS',
                price: product.priceValue,
                availability:
                  product.isActive && product.stock > 0
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
              },
            }
          : null,
      );
    });
    this.destroyRef.onDestroy(() => this.seoService.setStructuredData(null));
  }
}
