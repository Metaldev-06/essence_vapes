import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminAuthService } from '../../data/admin-auth.service';
import { ProductsAdminService } from '../../data/products-admin.service';
import type { Product } from '../../../ecommerce/data/product.model';

const LOW_STOCK_THRESHOLD = 5;

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export default class Dashboard {
  protected readonly adminAuthService = inject(AdminAuthService);
  private readonly productsAdminService = inject(ProductsAdminService);

  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly total = signal(0);
  private readonly products = signal<Product[]>([]);

  protected readonly activeCount = computed(
    () => this.products().filter((product) => product.isActive).length,
  );
  protected readonly featuredCount = computed(
    () => this.products().filter((product) => product.featured).length,
  );
  protected readonly outOfStockCount = computed(
    () => this.products().filter((product) => product.stock === 0).length,
  );
  protected readonly lowStock = computed(() =>
    this.products()
      .filter((product) => product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.stock - b.stock),
  );

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // 100 is the API's own page-size cap; fine for this catalog's scale - see the dashboard's
      // own note in the template about counts only covering the first 100 products.
      const page = await this.productsAdminService.list({ limit: 100 });
      this.products.set(page.data);
      this.total.set(page.pagination.total);
    } catch {
      this.error.set('No pudimos cargar las estadísticas. Probá de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
