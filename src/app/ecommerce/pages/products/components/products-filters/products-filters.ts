import { Component, input, model, output } from '@angular/core';
import type { ProductStyle, ProductStyleOption, SortOption } from '../../../../data/product.model';

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
  /** Fragrance pills for perfumes/decants, flavor pills for vapes/esencias, or empty for "todos". */
  readonly styleOptions = input.required<readonly ProductStyleOption[]>();

  readonly sortOptions = input.required<readonly FilterOption<SortOption>[]>();
  readonly activeStyles = input<ReadonlySet<ProductStyle>>(new Set());

  readonly sort = model.required<SortOption>();
  readonly search = model('');

  readonly toggleStyle = output<ProductStyle>();
  readonly clearStyles = output<void>();

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onSortChange(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortOption);
  }
}
