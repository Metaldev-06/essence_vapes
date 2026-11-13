import { Component, computed, debounced, effect, inject, signal, untracked } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AdminProductsFiltersStore } from '../../data/admin-products-filters-store';
import { extractErrorMessage } from '../../data/extract-error-message';
import { ProductsAdminService } from '../../data/products-admin.service';
import { cloudinaryUrl } from '../../../ecommerce/data/cloudinary-url.helper';
import { ConfirmDialog, type ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
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
const TABLE_PREFS_STORAGE_KEY = 'essence-vapes-admin-products-table-prefs';

type ProductColumn = 'price' | 'stock' | 'visible' | 'featured';
const ALL_COLUMNS: readonly { id: ProductColumn; label: string }[] = [
  { id: 'price', label: 'Precio' },
  { id: 'stock', label: 'Stock' },
  { id: 'visible', label: 'Visible' },
  { id: 'featured', label: 'Destacado' },
];

interface TablePrefs {
  readonly columns: readonly ProductColumn[];
  readonly density: 'comfortable' | 'compact';
}

const DEFAULT_TABLE_PREFS: TablePrefs = {
  columns: ['price', 'stock', 'visible', 'featured'],
  density: 'comfortable',
};

/** Preferencias de tabla (ver tarea, punto 5.1) - puramente de UI, por eso vive en localStorage
 *  en vez del backend (no hay nada que sincronizar entre dispositivos). */
const readTablePrefs = (): TablePrefs => {
  try {
    const raw = localStorage.getItem(TABLE_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_TABLE_PREFS;
    const parsed = JSON.parse(raw) as Partial<TablePrefs>;
    return {
      columns: parsed.columns ?? DEFAULT_TABLE_PREFS.columns,
      density: parsed.density ?? DEFAULT_TABLE_PREFS.density,
    };
  } catch {
    return DEFAULT_TABLE_PREFS;
  }
};

const csvField = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

interface CategoryOption {
  readonly id: ProductCategory | 'todos';
  readonly label: string;
}

@Component({
  selector: 'app-admin-products',
  imports: [RouterLink, NgOptimizedImage, ToggleSwitch, Toast, ConfirmDialog],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export default class AdminProducts {
  private readonly productsAdminService = inject(ProductsAdminService);
  private readonly filtersStore = inject(AdminProductsFiltersStore);
  protected readonly cloudinaryUrl = cloudinaryUrl;

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

  private readonly savedFilters = this.filtersStore.read();

  protected readonly search = signal(this.savedFilters.search);
  protected readonly category = signal<ProductCategory | 'todos'>(this.savedFilters.category);
  protected readonly brand = signal('');
  protected readonly minPrice = signal('');
  protected readonly maxPrice = signal('');
  protected readonly minStock = signal('');
  protected readonly maxStock = signal('');
  protected readonly isActive = signal<'todos' | 'true' | 'false'>('todos');
  protected readonly offset = signal(0);

  private readonly debouncedSearch = debounced(this.search, 300);

  protected readonly items = signal<Product[]>([]);
  protected readonly total = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  /** The product awaiting delete confirmation in the modal - `null` while it's closed. */
  protected readonly pendingDelete = signal<Product | null>(null);
  /** Ids whose visibility change is still in flight - their switch shows a busy state. */
  protected readonly togglingIds = signal<ReadonlySet<string>>(new Set());
  /** Ids whose "destacado" change is still in flight - their switch shows a busy state. */
  protected readonly togglingFeaturedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly toast = signal<ToastMessage | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  /** Selección para acciones masivas (ver tarea, punto 5.2) - solo ids de la página actual (no
   *  persiste entre páginas, para no "seleccionar" productos que el admin nunca vio). */
  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly bulkBusy = signal(false);
  protected readonly bulkCategory = signal<ProductCategory | ''>('');

  /** Columnas visibles + densidad (ver tarea, punto 5.1) - preferencia de UI persistida en
   *  localStorage. */
  protected readonly allColumns = ALL_COLUMNS;
  private readonly initialTablePrefs = readTablePrefs();
  protected readonly visibleColumns = signal<ReadonlySet<ProductColumn>>(
    new Set(this.initialTablePrefs.columns),
  );
  protected readonly density = signal<'comfortable' | 'compact'>(this.initialTablePrefs.density);
  protected readonly tableSettingsOpen = signal(false);

  protected readonly selectedCount = computed(() => this.selectedIds().size);
  protected readonly allSelected = computed(
    () => this.items().length > 0 && this.selectedIds().size === this.items().length,
  );

  protected readonly hasFilters = computed(
    () =>
      this.search().trim() !== '' ||
      this.category() !== 'todos' ||
      this.brand().trim() !== '' ||
      this.minPrice().trim() !== '' ||
      this.maxPrice().trim() !== '' ||
      this.minStock().trim() !== '' ||
      this.maxStock().trim() !== '' ||
      this.isActive() !== 'todos',
  );
  protected readonly page = computed(() => Math.floor(this.offset() / PAGE_SIZE) + 1);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly hasPrev = computed(() => this.offset() > 0);
  protected readonly hasNext = computed(() => this.offset() + PAGE_SIZE < this.total());
  protected readonly deleteDialogData = computed<ConfirmDialogData | null>(() => {
    const product = this.pendingDelete();
    if (!product) return null;
    return {
      title: 'Eliminar producto',
      message: `¿Eliminar "${product.name}" de forma permanente? Esta acción no se puede deshacer.`,
      note: 'Si solo querés que no aparezca en la tienda, usá el interruptor "Visible".',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    };
  });

  constructor() {
    // Persists search + category on every change so a page refresh keeps the filter applied.
    effect(() => {
      const snapshot = { search: this.search(), category: this.category() };
      untracked(() => this.filtersStore.write(snapshot));
    });

    effect(() => {
      const prefs: TablePrefs = { columns: [...this.visibleColumns()], density: this.density() };
      untracked(() => localStorage.setItem(TABLE_PREFS_STORAGE_KEY, JSON.stringify(prefs)));
    });

    // Reacts only to the filters (not to `offset`) and snaps pagination back to page one.
    effect(() => {
      this.debouncedSearch.value();
      this.category();
      this.brand();
      this.minPrice();
      this.maxPrice();
      this.minStock();
      this.maxStock();
      this.isActive();
      untracked(() => this.offset.set(0));
    });

    // Reacts to the full filter set (including offset) and (re)loads the current page.
    effect(() => {
      const term = this.debouncedSearch.value();
      const category = this.category();
      const brand = this.brand();
      const minPrice = this.minPrice();
      const maxPrice = this.maxPrice();
      const minStock = this.minStock();
      const maxStock = this.maxStock();
      const isActive = this.isActive();
      const offset = this.offset();
      untracked(
        () =>
          void this.load(term, category, brand, minPrice, maxPrice, minStock, maxStock, isActive, offset),
      );
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
    this.brand.set('');
    this.minPrice.set('');
    this.maxPrice.set('');
    this.minStock.set('');
    this.maxStock.set('');
    this.isActive.set('todos');
    this.filtersStore.clear();
  }

  protected onBrandInput(event: Event): void {
    this.brand.set((event.target as HTMLInputElement).value);
  }

  protected onMinPriceChange(event: Event): void {
    this.minPrice.set((event.target as HTMLInputElement).value);
  }

  protected onMaxPriceChange(event: Event): void {
    this.maxPrice.set((event.target as HTMLInputElement).value);
  }

  protected onMinStockChange(event: Event): void {
    this.minStock.set((event.target as HTMLInputElement).value);
  }

  protected onMaxStockChange(event: Event): void {
    this.maxStock.set((event.target as HTMLInputElement).value);
  }

  protected onIsActiveChange(event: Event): void {
    this.isActive.set((event.target as HTMLSelectElement).value as 'todos' | 'true' | 'false');
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

  /** Same optimistic-flip-then-confirm pattern as `setVisibility`, for the "Destacado" switch. */
  protected async setFeatured(product: Product, featured: boolean): Promise<void> {
    this.patchItem(product.id, { featured });
    this.togglingFeaturedIds.update((ids) => new Set(ids).add(product.id));
    try {
      await this.productsAdminService.update(product.id, { featured });
      this.showToast(
        featured
          ? `"${product.name}" ahora está destacado`
          : `"${product.name}" ya no está destacado`,
        'success',
      );
    } catch (error) {
      this.patchItem(product.id, { featured: !featured });
      this.showToast(`No se pudo cambiar el destacado: ${extractErrorMessage(error)}`, 'error');
    } finally {
      this.togglingFeaturedIds.update((ids) => {
        const next = new Set(ids);
        next.delete(product.id);
        return next;
      });
    }
  }

  protected remove(product: Product): void {
    this.pendingDelete.set(product);
  }

  protected cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  protected async confirmDelete(): Promise<void> {
    const product = this.pendingDelete();
    if (!product) return;
    this.pendingDelete.set(null);

    this.deletingId.set(product.id);
    this.error.set(null);
    try {
      await this.productsAdminService.remove(product.id);
      await this.load(
        this.debouncedSearch.value(),
        this.category(),
        this.brand(),
        this.minPrice(),
        this.maxPrice(),
        this.minStock(),
        this.maxStock(),
        this.isActive(),
        this.offset(),
      );
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

  protected toggleSelect(id: string, checked: boolean): void {
    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected toggleSelectAll(checked: boolean): void {
    this.selectedIds.set(checked ? new Set(this.items().map((item) => item.id)) : new Set());
  }

  protected toggleColumn(column: ProductColumn, visible: boolean): void {
    this.visibleColumns.update((current) => {
      const next = new Set(current);
      if (visible) next.add(column);
      else next.delete(column);
      return next;
    });
  }

  protected onColumnToggleChange(column: ProductColumn, event: Event): void {
    this.toggleColumn(column, (event.target as HTMLInputElement).checked);
  }

  protected setDensity(density: 'comfortable' | 'compact'): void {
    this.density.set(density);
  }

  protected onSelectAllChange(event: Event): void {
    this.toggleSelectAll((event.target as HTMLInputElement).checked);
  }

  protected onRowSelectChange(id: string, event: Event): void {
    this.toggleSelect(id, (event.target as HTMLInputElement).checked);
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  protected onBulkCategoryChange(event: Event): void {
    this.bulkCategory.set((event.target as HTMLSelectElement).value as ProductCategory | '');
  }

  protected async applyBulkCategory(): Promise<void> {
    const category = this.bulkCategory();
    if (!category) return;
    await this.runBulkUpdate({ category }, `Categoría actualizada`);
    this.bulkCategory.set('');
  }

  protected async bulkPublish(): Promise<void> {
    await this.runBulkUpdate({ isActive: true }, 'Productos publicados');
  }

  protected async bulkHide(): Promise<void> {
    await this.runBulkUpdate({ isActive: false }, 'Productos ocultados');
  }

  protected async bulkFeature(): Promise<void> {
    await this.runBulkUpdate({ featured: true }, 'Productos marcados como destacados');
  }

  protected async bulkUnfeature(): Promise<void> {
    await this.runBulkUpdate({ featured: false }, 'Productos quitados de destacados');
  }

  protected exportSelectedCsv(): void {
    const selected = this.items().filter((item) => this.selectedIds().has(item.id));
    if (selected.length === 0) return;
    const lines = [
      `# Generado: ${new Date().toISOString()}`,
      ['Nombre', 'Marca', 'Categoría', 'Precio', 'Stock', 'Visible', 'Destacado'].join(','),
      ...selected.map((item) =>
        [
          csvField(item.name),
          csvField(item.brand),
          csvField(this.categoryLabels[item.category]),
          String(item.priceValue),
          String(item.stock),
          item.isActive ? 'si' : 'no',
          item.featured ? 'si' : 'no',
        ].join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private async runBulkUpdate(
    changes: { isActive?: boolean; featured?: boolean; category?: ProductCategory },
    successLabel: string,
  ): Promise<void> {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;

    this.bulkBusy.set(true);
    try {
      await this.productsAdminService.bulkUpdate(ids, changes);
      this.showToast(`${successLabel} (${ids.length}).`, 'success');
      await this.load(
        this.debouncedSearch.value(),
        this.category(),
        this.brand(),
        this.minPrice(),
        this.maxPrice(),
        this.minStock(),
        this.maxStock(),
        this.isActive(),
        this.offset(),
      );
    } catch (error) {
      this.showToast(`No se pudo aplicar la acción: ${extractErrorMessage(error)}`, 'error');
    } finally {
      this.bulkBusy.set(false);
    }
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
    brand: string,
    minPrice: string,
    maxPrice: string,
    minStock: string,
    maxStock: string,
    isActive: 'todos' | 'true' | 'false',
    offset: number,
  ): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const page = await this.productsAdminService.list({
        term: term.trim() || undefined,
        category: category === 'todos' ? undefined : category,
        brand: brand.trim() || undefined,
        minPrice: minPrice.trim() ? Number(minPrice) : undefined,
        maxPrice: maxPrice.trim() ? Number(maxPrice) : undefined,
        minStock: minStock.trim() ? Number(minStock) : undefined,
        maxStock: maxStock.trim() ? Number(maxStock) : undefined,
        isActive: isActive === 'todos' ? undefined : isActive === 'true',
        limit: PAGE_SIZE,
        offset,
      });
      this.items.set(page.data);
      this.total.set(page.pagination.total);
      this.selectedIds.set(new Set());
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}
