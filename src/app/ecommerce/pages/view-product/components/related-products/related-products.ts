import { Component, input } from '@angular/core';
import { ProductCard } from '../../../../shared/product-card/product-card';
import type { Product } from '../../../../data/product.model';

@Component({
  selector: 'app-related-products',
  imports: [ProductCard],
  templateUrl: './related-products.html',
  styleUrl: './related-products.css',
})
export class RelatedProducts {
  readonly products = input.required<readonly Product[]>();
}
