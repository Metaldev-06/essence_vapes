import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ProductsService } from '../../data/products.service';
import { ProductGallery } from './components/product-gallery/product-gallery';
import { ProductDetails } from './components/product-details/product-details';
import { FragranceProfile } from './components/fragrance-profile/fragrance-profile';
import { UsageGuide } from './components/usage-guide/usage-guide';
import { ProductPerformance } from './components/product-performance/product-performance';
import { RelatedProducts } from './components/related-products/related-products';

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
  ],
  templateUrl: './view-product.html',
  styleUrl: './view-product.css',
})
export default class ViewProduct {
  private readonly productsService = inject(ProductsService);
  private readonly titleService = inject(Title);

  readonly id = input('');

  private readonly productResource = this.productsService.byId(this.id);
  protected readonly product = this.productResource.value;

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
      .filter((item) => item.id !== current.id)
      .slice(0, 4);
  });

  constructor() {
    effect(() => {
      const product = this.product();
      this.titleService.setTitle(product ? `${product.name} | Essence Vapes` : 'Producto | Essence Vapes');
    });
  }
}
