import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductsService } from '../../../../data/products.service';
import { ProductCard } from '../../../../shared/product-card/product-card';

@Component({
  selector: 'app-featured-products',
  imports: [RouterLink, ProductCard],
  templateUrl: './featured-products.html',
  styleUrl: './featured-products.css',
})
export class FeaturedProducts {
  private readonly productsService = inject(ProductsService);

  protected readonly products = this.productsService.getFeatured();
}
