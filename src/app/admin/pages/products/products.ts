import { Component, computed, debounced, effect, inject, signal, untracked } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

import { extractErrorMessage } from '../../data/extract-error-message';
import { ProductsAdminService } from '../../data/products-admin.service';
import { Toast, type ToastMessage } from '../../shared/toast/toast';
import { ToggleSwitch } from '../../shared/toggle-switch/toggle-switch';
import {
  CATEGORY_LABELS,
  type Product,
  type ProductCategory,
} from '../../../ecommerce/data/product.model';

const PAGE_SIZE = 20;
const LOW_STOCK_THRESHOLD = 5;
const TOAST_DURATION_MS = 3500;

interface CategoryOption {
  readonly id: ProductCategory | 'todos';
  readonly label: string;
}

@Component({
  selector: 'app-admin-products',
  imports: [RouterLink, NgOptimizedImage, ToggleSwitch, Toast],
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
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly lowStockThreshold = LOW_STOCK_THRESHOLD;
  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  protected readonly search = signal('');
  protected readonly category = signal<ProductCategory | 'todos'>('todos');
  protected readonly offset = signal(0);

  private readonly debouncedSearch = debounced(this.search, 300);

  protected readonly items = signal<Product[]>([]);
  protected readonly total = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  /** Ids whose visibility change is still in flight - their switch shows a busy state. */
  protected readonly togglingIds = signal<ReadonlySet<string>>(new Set());
  protected readonly toast = signal<ToastMessage | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly hasFilters = computed(
    () => this.search().trim() !== '' || this.category() !== 'todos',
  );
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

  protected clearFilters(): void {
    this.search.set('');
    this.category.set('todos');
  }

  /**
   * Optimistic: the row flips immediately and only rolls back if the PATCH fails, so the switch
   * feels instant. Re-setting `items` on rollback is also what re-syncs the switch's own `checked`.
   */
  protected async setVisibility(product: Product, isActive: boolean): Promise<void> {
    this.patchItem(product.id, { isActive });
    this.togglingIds.update((ids) => new Set(ids).add(product.id));
    try {
      await this.productsAdminService.update(product.id, { isActive });
      this.showToast(
        isActive
          ? `"${product.name}" ahora es visible en la tienda`
          : `"${product.name}" quedó oculto de la tienda`,
        'success',
      );
    } catch (error) {
      this.patchItem(product.id, { isActive: !isActive });
      this.showToast(`No se pudo cambiar la visibilidad: ${extractErrorMessage(error)}`, 'error');
    } finally {
      this.togglingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(product.id);
        return next;
      });
    }
  }

  protected async remove(product: Product): Promise<void> {
    const confirmed = confirm(
      `¿Eliminar "${product.name}" de forma permanente? Esta acción no se puede deshacer.\n\nSi solo querés que no aparezca en la tienda, usá el interruptor "Visible".`,
    );
    if (!confirmed) return;

    this.deletingId.set(product.id);
    this.error.set(null);
    try {
      await this.productsAdminService.remove(product.id);
      await this.load(this.debouncedSearch.value(), this.category(), this.offset());
      this.showToast(`"${product.name}" fue eliminado`, 'success');
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.deletingId.set(null);
    }
  }

  protected dismissToast(): void {
    clearTimeout(this.toastTimer);
    this.toast.set(null);
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  private patchItem(id: string, changes: Partial<Product>): void {
    this.items.update((items) =>
      items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }

  private showToast(message: string, tone: ToastMessage['tone']): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ message, tone });
    this.toastTimer = setTimeout(() => this.toast.set(null), TOAST_DURATION_MS);
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
}
