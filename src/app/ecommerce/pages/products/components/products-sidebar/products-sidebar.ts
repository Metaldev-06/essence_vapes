import { Component, computed, input, model } from '@angular/core';
import type { FilterOption } from '../products-filters/products-filters';
import type { Gender, ProductCategory } from '../../../../data/product.model';

@Component({
  selector: 'app-products-sidebar',
  imports: [],
  templateUrl: './products-sidebar.html',
  styleUrl: './products-sidebar.css',
})
export class ProductsSidebar {
  readonly categories = input.required<readonly FilterOption<ProductCategory | 'todos'>[]>();
  readonly genderOptions = input.required<readonly FilterOption<Gender | 'todos'>[]>();
  readonly showGender = input<boolean>(true);
  readonly capacityOptions = input<readonly number[]>([]);
  readonly capacitySuffix = input<string>('ml');
  readonly brandOptions = input<readonly string[]>([]);

  readonly category = model.required<ProductCategory | 'todos'>();
  readonly gender = model.required<Gender | 'todos'>();
  readonly capacity = model<number | 'todas'>('todas');
  readonly brand = model<string | 'todas'>('todas');

  protected readonly hasActiveFilters = computed(
    () =>
      this.category() !== 'todos' ||
      this.gender() !== 'todos' ||
      this.capacity() !== 'todas' ||
      this.brand() !== 'todas',
  );

  // Bound to each collapsible section's `[open]` - only re-asserted when the boolean itself
  // flips (Angular skips the DOM write when the expression is unchanged), so a selection made
  // via a deep link or another section opens the relevant panel automatically without fighting
  // the user if they manually collapse it again afterwards.
  protected readonly brandOpen = computed(() => this.brand() !== 'todas');
  protected readonly genderOpen = computed(() => this.gender() !== 'todos');
  protected readonly capacityOpen = computed(() => this.capacity() !== 'todas');

  protected clearAll(): void {
    this.category.set('todos');
    this.gender.set('todos');
    this.capacity.set('todas');
    this.brand.set('todas');
  }
}
