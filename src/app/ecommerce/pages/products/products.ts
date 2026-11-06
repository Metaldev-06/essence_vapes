import {
  Component,
  computed,
  debounced,
  effect,
  inject,
  signal,
  untracked,
  type OnDestroy,
} from '@angular/core';
import {
  ProductsService,
  PRODUCTS_PAGE_SIZE,
  type ProductsQuery,
  type ProductsSortField,
} from '../../data/products.service';
import { ProductsFiltersStore } from '../../data/products-filters-store';
import type {
  Gender,
  Product,
  ProductCategory,
  ScentStyle,
  SortOption,
} from '../../data/product.model';
import { ProductsHeader } from './components/products-header/products-header';
import { ProductsFilters, type FilterOption } from './components/products-filters/products-filters';
import { ProductsGrid } from './components/products-grid/products-grid';

@Component({
  selector: 'app-products',
  imports: [ProductsHeader, ProductsFilters, ProductsGrid],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export default class Products implements OnDestroy {
  private readonly productsService = inject(ProductsService);
  private readonly filtersStore = inject(ProductsFiltersStore);

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

  protected readonly genderOptions: readonly FilterOption<Gender | 'todos'>[] = [
    { id: 'todos', label: 'Todos los géneros' },
    { id: 'masculino', label: 'Masculino' },
    { id: 'femenino', label: 'Femenino' },
    { id: 'unisex', label: 'Unisex' },
  ];

  /** Read once on load - this page never reflects its filters in the URL, only in sessionStorage. */
  private readonly initialFilters = this.filtersStore.read();

  protected readonly search = signal(this.initialFilters.term);
  protected readonly activeCategory = signal<ProductCategory | 'todos'>(this.initialFilters.category);
  protected readonly activeGender = signal<Gender | 'todos'>(this.initialFilters.gender);
  protected readonly sortBy = signal<SortOption>(this.initialFilters.sort);
  protected readonly activeStyles = signal<ReadonlySet<ScentStyle>>(
    new Set(this.initialFilters.styles),
  );
  protected readonly activeCapacity = signal<number | 'todas'>(
    this.initialFilters.capacityMl ?? 'todas',
  );
  protected readonly capacityOptions = this.productsService.capacities;

  private readonly debouncedSearch = debounced(this.search, 300);
  private readonly offset = signal(0);

  private readonly productsResource = this.productsService.list(() => ({
    ...this.buildFilters(),
    limit: PRODUCTS_PAGE_SIZE,
    offset: this.offset(),
  }));

  protected readonly items = signal<Product[]>([]);
  protected readonly total = signal(0);

  protected readonly isLoading = this.productsResource.isLoading;
  protected readonly hasMore = computed(() => this.items().length < this.total());

  constructor() {
    // Reacts only to filter changes (not to `offset`) and resets pagination back to page one.
    effect(() => {
      this.buildFilters();
      untracked(() => {
        this.offset.set(0);
        this.items.set([]);
      });
    });

    // Reacts to each resolved page and appends it, unless it's a fresh first page.
    effect(() => {
      const page = this.productsResource.value();
      const isFirstPage = untracked(() => this.offset()) === 0;
      this.items.set(isFirstPage ? page.data : [...untracked(() => this.items()), ...page.data]);
      this.total.set(page.pagination.total);
    });

    // Persists every filter change to sessionStorage - a refresh (or navigating away and back)
    // keeps whatever was last applied, since none of this ever reaches the URL.
    effect(() => {
      const styles = this.activeStyles();
      const capacity = this.activeCapacity();
      this.filtersStore.write({
        term: this.search(),
        category: this.activeCategory(),
        gender: this.activeGender(),
        sort: this.sortBy(),
        styles: Array.from(styles),
        capacityMl: capacity === 'todas' ? null : capacity,
      });
    });
  }

  /** Leaving the page resets the filters for next time - only a refresh WHILE on it keeps them. */
  ngOnDestroy(): void {
    this.filtersStore.clear();
  }

  protected loadMore(): void {
    if (!this.hasMore() || this.isLoading()) {
      return;
    }
    this.offset.update((value) => value + PRODUCTS_PAGE_SIZE);
  }

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

  private buildFilters(): ProductsQuery {
    const term = this.debouncedSearch.value().trim();
    const category = this.activeCategory();
    const gender = this.activeGender();
    const styles = this.activeStyles();
    const capacity = this.activeCapacity();

    return {
      term: term.length > 0 ? term : undefined,
      category: category === 'todos' ? undefined : category,
      gender: gender === 'todos' ? undefined : gender,
      styles: styles.size > 0 ? Array.from(styles) : undefined,
      capacityMl: capacity === 'todas' ? undefined : [capacity],
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
}
