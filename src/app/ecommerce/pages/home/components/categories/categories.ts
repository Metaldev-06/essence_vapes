import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DEFAULT_PRODUCTS_FILTERS, ProductsFiltersStore } from '../../../../data/products-filters-store';
import type { ProductCategory } from '../../../../data/product.model';

interface Category {
  readonly id: ProductCategory;
  readonly name: string;
  /** Small muted line above the title - only the main (Perfumes) card shows one. */
  readonly label: string;
  readonly description: string;
  readonly ctaLabel: string;
  readonly image: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly variantClass: string;
}

@Component({
  selector: 'app-categories',
  imports: [NgOptimizedImage],
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
      label: 'Fragancias originales',
      description: 'Descubrí una selección de fragancias originales de las mejores marcas, para cada ocasión.',
      ctaLabel: 'Explorar perfumes',
      image: 'images/categories/perfumes.webp',
      imageWidth: 800,
      imageHeight: 600,
      variantClass: 'category-card--main category-card--violet',
    },
    {
      id: 'decants',
      name: 'Decants',
      label: '',
      description: 'Probá tus fragancias favoritas en formatos más accesibles, ideales para conocer nuevas opciones.',
      ctaLabel: 'Ver decants',
      image: 'images/categories/decants.webp',
      imageWidth: 800,
      imageHeight: 600,
      variantClass: 'category-card--cyan category-card--wide',
    },
    {
      id: 'vapes',
      name: 'Vapes',
      label: '',
      description: 'Dispositivos modernos, seguros y con el mejor rendimiento.',
      ctaLabel: 'Ver vapes',
      image: 'images/categories/vapes.webp',
      imageWidth: 800,
      imageHeight: 600,
      variantClass: 'category-card--emerald',
    },
    {
      id: 'esencias',
      name: 'Esencias',
      label: '',
      description: 'Líquidos y sabores para dispositivos recargables. Gran variedad de gustos.',
      ctaLabel: 'Ver esencias',
      image: 'images/categories/esencias.webp',
      imageWidth: 800,
      imageHeight: 533,
      variantClass: 'category-card--violet',
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
