import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductsService } from '../../data/products.service';
import { ProductGallery } from './components/product-gallery/product-gallery';
import { ProductDetails } from './components/product-details/product-details';
import { RelatedProducts } from './components/related-products/related-products';

@Component({
  selector: 'app-view-product',
  imports: [RouterLink, ProductGallery, ProductDetails, RelatedProducts],
  templateUrl: './view-product.html',
  styleUrl: './view-product.css',
})
export default class ViewProduct {
  private readonly productsService = inject(ProductsService);

  readonly id = input('');

  protected readonly product = computed(() => this.productsService.getById(this.id()));

  protected readonly relatedProducts = computed(() => {
    const current = this.product();
    if (!current) {
      return [];
    }
    return this.productsService
      .getAll()
      .filter((item) => item.category === current.category && item.id !== current.id)
      .slice(0, 4);
  });
}
