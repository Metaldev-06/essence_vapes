import { Component, input, model, output } from '@angular/core';
import { SCENT_STYLE_OPTIONS } from '../../../../data/scent-styles';
import type { ProductCategory, ScentStyle, SortOption } from '../../../../data/product.model';

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
  protected readonly styleOptions = SCENT_STYLE_OPTIONS;

  readonly categories = input.required<readonly FilterOption<ProductCategory | 'todos'>[]>();
  readonly sortOptions = input.required<readonly FilterOption<SortOption>[]>();
  readonly activeStyles = input<ReadonlySet<ScentStyle>>(new Set());

  readonly category = model.required<ProductCategory | 'todos'>();
  readonly sort = model.required<SortOption>();
  readonly search = model('');

  readonly toggleStyle = output<ScentStyle>();
  readonly clearStyles = output<void>();

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onSortChange(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortOption);
  }
}
