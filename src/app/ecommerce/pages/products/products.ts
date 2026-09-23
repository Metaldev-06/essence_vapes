import { Component, computed, debounced, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductsService, type ProductsQuery, type ProductsSortField } from '../../data/products.service';
import type { ProductCategory, ScentStyle, SortOption } from '../../data/product.model';
import { ProductsHeader } from './components/products-header/products-header';
import { ProductsFilters, type FilterOption } from './components/products-filters/products-filters';
import { ProductsGrid } from './components/products-grid/products-grid';

@Component({
  selector: 'app-products',
  imports: [ProductsHeader, ProductsFilters, ProductsGrid],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export default class Products {
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);

  protected readonly categories: readonly FilterOption<ProductCategory | 'todos'>[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'perfumes', label: 'Perfumes' },
    { id: 'decants', label: 'Decants' },
    { id: 'vapes', label: 'Vapes' },
    { id: 'esencias', label: 'Esencias' },
  ];

  protected readonly sortOptions: readonly FilterOption<SortOption>[] = [
    { id: 'destacados', label: 'Destacados' },
    { id: 'precio-asc', label: 'Precio: menor a mayor' },
    { id: 'precio-desc', label: 'Precio: mayor a menor' },
    { id: 'nombre', label: 'Nombre A-Z' },
  ];

  protected readonly search = signal('');
  protected readonly activeCategory = signal<ProductCategory | 'todos'>(this.readInitialCategory());
  protected readonly sortBy = signal<SortOption>('destacados');
  protected readonly activeStyles = signal<ReadonlySet<ScentStyle>>(this.readInitialStyles());

  private readonly debouncedSearch = debounced(this.search, 300);

  private readonly productsResource = this.productsService.list(() => this.buildQuery());

  protected readonly filteredProducts = this.productsResource.value;
  protected readonly isLoading = this.productsResource.isLoading;

  protected toggleStyle(style: ScentStyle): void {
    this.activeStyles.update((current) => {
      const next = new Set(current);
      if (next.has(style)) {
        next.delete(style);
      } else {
        next.add(style);
      }
      return next;
    });
  }

  protected clearStyles(): void {
    this.activeStyles.set(new Set());
  }

  private buildQuery(): ProductsQuery {
    const term = this.debouncedSearch.value().trim();
    const category = this.activeCategory();
    const styles = this.activeStyles();

    return {
      term: term.length > 0 ? term : undefined,
      category: category === 'todos' ? undefined : category,
      styles: styles.size > 0 ? Array.from(styles) : undefined,
      limit: 100,
      ...this.sortParams(this.sortBy()),
    };
  }

  private sortParams(sort: SortOption): { sort: ProductsSortField; order: 'asc' | 'desc' } {
    switch (sort) {
      case 'precio-asc':
        return { sort: 'priceValue', order: 'asc' };
      case 'precio-desc':
        return { sort: 'priceValue', order: 'desc' };
      case 'nombre':
        return { sort: 'name', order: 'asc' };
      default:
        return { sort: 'featured', order: 'desc' };
    }
  }

  private readInitialCategory(): ProductCategory | 'todos' {
    const value = this.route.snapshot.queryParamMap.get('cat');
    const valid: readonly string[] = ['perfumes', 'decants', 'vapes', 'esencias'];
    return valid.includes(value ?? '') ? (value as ProductCategory) : 'todos';
  }

  private readInitialStyles(): ReadonlySet<ScentStyle> {
    const valid: readonly string[] = ['fresco', 'dulce', 'intenso', 'elegante', 'nocturno', 'citrico'];
    const raw = this.route.snapshot.queryParamMap.get('styles') ?? '';
    const styles = raw
      .split(',')
      .map((style) => style.trim())
      .filter((style): style is ScentStyle => valid.includes(style));
    return new Set(styles);
  }
}
