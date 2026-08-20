import { Component, input, model, output } from '@angular/core';
import type { ProductCategory, SortOption } from '../../../../data/product.model';

export interface FilterOption<T extends string> {
  readonly id: T;
  readonly label: string;
}

@Component({
  selector: 'app-products-filters',
  imports: [],
  templateUrl: './products-filters.html',
  styleUrl: './products-filters.css',
})
export class ProductsFilters {
  readonly categories = input.required<readonly FilterOption<ProductCategory | 'todos'>[]>();
  readonly sortOptions = input.required<readonly FilterOption<SortOption>[]>();
  readonly activeStylesCount = input(0);

  readonly category = model.required<ProductCategory | 'todos'>();
  readonly sort = model.required<SortOption>();
  readonly search = model('');

  readonly clearStyles = output<void>();

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onSortChange(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortOption);
  }
}
