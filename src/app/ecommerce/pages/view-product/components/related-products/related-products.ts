import { Component, computed, input } from '@angular/core';
import { ProductCard } from '../../../../shared/product-card/product-card';
import type { Product } from '../../../../data/product.model';

interface RelatedItem {
  readonly product: Product;
  readonly matchPercent?: number;
}

@Component({
  selector: 'app-related-products',
  imports: [ProductCard],
  templateUrl: './related-products.html',
  styleUrl: './related-products.css',
})
export class RelatedProducts {
  readonly currentProduct = input.required<Product>();
  readonly products = input.required<readonly Product[]>();

  protected readonly items = computed<readonly RelatedItem[]>(() => {
    const currentAccords = this.currentProduct().accords;

    return this.products().map((product) => {
      if (!currentAccords || !product.accords) {
        return { product };
      }
      const shared = product.accords.filter((accord) => currentAccords.includes(accord));
      const base = Math.max(currentAccords.length, product.accords.length, 1);
      return { product, matchPercent: Math.round((shared.length / base) * 100) };
    });
  });
}
