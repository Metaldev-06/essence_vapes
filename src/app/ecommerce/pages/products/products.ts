import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductsService } from '../../data/products.service';
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

  private readonly allProducts = this.productsService.getAll();

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

  protected readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const category = this.activeCategory();
    const styles = this.activeStyles();

    const filtered = this.allProducts.filter((product) => {
      const matchesCategory = category === 'todos' || product.category === category;
      const matchesStyles = styles.size === 0 || product.styles.some((style) => styles.has(style));
      const matchesQuery =
        query.length === 0 ||
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query);
      return matchesCategory && matchesStyles && matchesQuery;
    });

    return [...filtered].sort((a, b) => {
      switch (this.sortBy()) {
        case 'precio-asc':
          return a.priceValue - b.priceValue;
        case 'precio-desc':
          return b.priceValue - a.priceValue;
        case 'nombre':
          return a.name.localeCompare(b.name);
        default:
          return Number(b.featured ?? false) - Number(a.featured ?? false);
      }
    });
  });

  protected clearStyles(): void {
    this.activeStyles.set(new Set());
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
