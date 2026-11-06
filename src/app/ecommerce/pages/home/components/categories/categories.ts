import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DEFAULT_PRODUCTS_FILTERS, ProductsFiltersStore } from '../../../../data/products-filters-store';
import type { ProductCategory } from '../../../../data/product.model';

interface Category {
  readonly id: ProductCategory;
  readonly name: string;
  readonly count: string;
  readonly icon: string;
  readonly variantClass: string;
}

@Component({
  selector: 'app-categories',
  imports: [],
  templateUrl: './categories.html',
  styleUrl: './categories.css',
})
export class Categories {
  private readonly router = inject(Router);
  private readonly filtersStore = inject(ProductsFiltersStore);

  protected readonly categories: readonly Category[] = [
    {
      id: 'perfumes',
      name: 'Perfumes',
      count: 'Fragancias originales',
      icon: '🌸',
      variantClass: 'category-card--main category-card--violet',
    },
    {
      id: 'decants',
      name: 'Decants',
      count: 'Desde 2ml',
      icon: '💧',
      variantClass: 'category-card--cyan',
    },
    {
      id: 'vapes',
      name: 'Vapes',
      count: 'Modelos disponibles',
      icon: '💨',
      variantClass: 'category-card--emerald',
    },
    {
      id: 'esencias',
      name: 'Esencias',
      count: 'Esencias seleccionadas',
      icon: '✨',
      variantClass: 'category-card--teal',
    },
  ];

  /**
   * Jumps straight into Productos filtered to this category - written to sessionStorage (see
   * `ProductsFiltersStore`), never as a query param in the URL.
   */
  protected goToCategory(category: ProductCategory): void {
    this.filtersStore.write({ ...DEFAULT_PRODUCTS_FILTERS, category });
    void this.router.navigateByUrl('/productos');
  }

  protected goToAll(): void {
    this.filtersStore.write(DEFAULT_PRODUCTS_FILTERS);
    void this.router.navigateByUrl('/productos');
  }
}
