import { Component, input } from '@angular/core';
import { ProductCard } from '../../../../shared/product-card/product-card';
import type { Product } from '../../../../data/product.model';

@Component({
  selector: 'app-products-grid',
  imports: [ProductCard],
  templateUrl: './products-grid.html',
  styleUrl: './products-grid.css',
})
export class ProductsGrid {
  readonly products = input.required<readonly Product[]>();
}
