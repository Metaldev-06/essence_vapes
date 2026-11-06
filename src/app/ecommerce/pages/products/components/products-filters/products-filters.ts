import { Component, input, model, output } from '@angular/core';
import { SCENT_STYLE_OPTIONS } from '../../../../data/scent-styles';
import type { Gender, ProductCategory, ScentStyle, SortOption } from '../../../../data/product.model';

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
  readonly genderOptions = input.required<readonly FilterOption<Gender | 'todos'>[]>();
  readonly activeStyles = input<ReadonlySet<ScentStyle>>(new Set());
  readonly capacityOptions = input<readonly number[]>([]);

  readonly category = model.required<ProductCategory | 'todos'>();
  readonly sort = model.required<SortOption>();
  readonly gender = model.required<Gender | 'todos'>();
  readonly search = model('');
  readonly capacity = model<number | 'todas'>('todas');

  readonly toggleStyle = output<ScentStyle>();
  readonly clearStyles = output<void>();

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onSortChange(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortOption);
  }

  protected onGenderChange(event: Event): void {
    this.gender.set((event.target as HTMLSelectElement).value as Gender | 'todos');
  }

  protected onCapacityChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.capacity.set(value === 'todas' ? 'todas' : Number(value));
  }
}
