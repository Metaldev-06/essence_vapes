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
  readonly capacityOptions = input<readonly number[]>([]);

  readonly category = model.required<ProductCategory | 'todos'>();
  readonly gender = model.required<Gender | 'todos'>();
  readonly capacity = model<number | 'todas'>('todas');

  protected readonly hasActiveFilters = computed(
    () => this.category() !== 'todos' || this.gender() !== 'todos' || this.capacity() !== 'todas',
  );

  protected clearAll(): void {
    this.category.set('todos');
    this.gender.set('todos');
    this.capacity.set('todas');
  }
}
