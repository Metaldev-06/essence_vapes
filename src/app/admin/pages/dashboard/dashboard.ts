import { Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AdminAuthService } from '../../data/admin-auth.service';
import { ProductsAdminService } from '../../data/products-admin.service';
import type { Product } from '../../../ecommerce/data/product.model';

const LOW_STOCK_THRESHOLD = 5;

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export default class Dashboard {
  protected readonly adminAuthService = inject(AdminAuthService);
  private readonly productsAdminService = inject(ProductsAdminService);

  protected readonly lowStockThreshold = LOW_STOCK_THRESHOLD;
  protected readonly skeletonTiles = [1, 2, 3, 4];

  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly total = signal(0);
  private readonly products = signal<Product[]>([]);

  protected readonly firstName = computed(
    () => this.adminAuthService.user()?.fullName.trim().split(/\s+/)[0] ?? '',
  );

  protected readonly visibleCount = computed(
    () => this.products().filter((product) => product.isActive).length,
  );
  protected readonly hiddenCount = computed(() => this.products().length - this.visibleCount());
  protected readonly featuredCount = computed(
    () => this.products().filter((product) => product.featured).length,
  );
  protected readonly outOfStockCount = computed(
    () => this.products().filter((product) => product.stock === 0).length,
  );

  /** Out-of-stock first, then the lowest stock - the products that need restocking soonest. */
  protected readonly needsAttention = computed(() =>
    this.products()
      .filter((product) => product.stock <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.stock - b.stock),
  );

  constructor() {
    void this.load();
  }

  protected retry(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // 100 is the API's own page-size cap; fine for this catalog's scale.
      const page = await this.productsAdminService.list({ limit: 100 });
      this.products.set(page.data);
      this.total.set(page.pagination.total);
    } catch {
      this.error.set('No pudimos cargar las estadísticas.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
