import { Component, computed, debounced, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { extractErrorMessage } from '../../data/extract-error-message';
import { ProductsAdminService } from '../../data/products-admin.service';
import type { Product, ProductCategory } from '../../../ecommerce/data/product.model';

const PAGE_SIZE = 20;

interface CategoryOption {
  readonly id: ProductCategory | 'todos';
  readonly label: string;
}

@Component({
  selector: 'app-admin-products',
  imports: [RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export default class AdminProducts {
  private readonly productsAdminService = inject(ProductsAdminService);

  protected readonly categories: readonly CategoryOption[] = [
    { id: 'todos', label: 'Todas' },
    { id: 'perfumes', label: 'Perfumes' },
    { id: 'decants', label: 'Decants' },
    { id: 'vapes', label: 'Vapes' },
    { id: 'esencias', label: 'Esencias' },
  ];

  protected readonly search = signal('');
  protected readonly category = signal<ProductCategory | 'todos'>('todos');
  protected readonly offset = signal(0);

  private readonly debouncedSearch = debounced(this.search, 300);

  protected readonly items = signal<Product[]>([]);
  protected readonly total = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

  protected readonly page = computed(() => Math.floor(this.offset() / PAGE_SIZE) + 1);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly hasPrev = computed(() => this.offset() > 0);
  protected readonly hasNext = computed(() => this.offset() + PAGE_SIZE < this.total());

  constructor() {
    // Reacts only to the filters (not to `offset`) and snaps pagination back to page one.
    effect(() => {
      this.debouncedSearch.value();
      this.category();
      untracked(() => this.offset.set(0));
    });

    // Reacts to the full filter set (including offset) and (re)loads the current page.
    effect(() => {
      const term = this.debouncedSearch.value();
      const category = this.category();
      const offset = this.offset();
      untracked(() => void this.load(term, category, offset));
    });
  }

  protected prevPage(): void {
    if (this.hasPrev()) this.offset.update((value) => Math.max(0, value - PAGE_SIZE));
  }

  protected nextPage(): void {
    if (this.hasNext()) this.offset.update((value) => value + PAGE_SIZE);
  }

  protected async remove(product: Product): Promise<void> {
    const confirmed = confirm(
      `¿Eliminar "${product.name}" de forma permanente? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    this.deletingId.set(product.id);
    this.error.set(null);
    try {
      await this.productsAdminService.remove(product.id);
      await this.load(this.debouncedSearch.value(), this.category(), this.offset());
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.deletingId.set(null);
    }
  }

  private async load(
    term: string,
    category: ProductCategory | 'todos',
    offset: number,
  ): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const page = await this.productsAdminService.list({
        term: term.trim() || undefined,
        category: category === 'todos' ? undefined : category,
        limit: PAGE_SIZE,
        offset,
      });
      this.items.set(page.data);
      this.total.set(page.pagination.total);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
}
