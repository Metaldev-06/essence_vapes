import { Component, computed, effect, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AdminAuthService } from '../../data/admin-auth.service';
import {
  OrdersAdminService,
  type OrdersStats,
  type SalesByCategoryPoint,
  type SalesSummary,
  type SalesSummaryComparison,
  type SalesTimeseriesGranularity,
  type SalesTimeseriesPoint,
  type TopProductPoint,
} from '../../data/orders-admin.service';
import { ProductsAdminService } from '../../data/products-admin.service';
import { cloudinaryUrl } from '../../../ecommerce/data/cloudinary-url.helper';
import { formatPrice } from '../../../ecommerce/data/format-price';
import type { Product } from '../../../ecommerce/data/product.model';
import { CategoryBreakdownChart, categoryLabel } from '../../shared/charts/category-breakdown-chart';
import { SalesEvolutionChart } from '../../shared/charts/sales-evolution-chart';
import { DateRangePicker } from '../../shared/date-range/date-range-picker';
import { resolveDateRangePreset, type DateRangeSelection } from '../../shared/date-range/date-range.model';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { KpiCard } from '../../shared/kpi-card/kpi-card';
import { percentChange } from './sales-kpi.helper';

const LOW_STOCK_THRESHOLD = 5;

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    RouterLink,
    NgOptimizedImage,
    DateRangePicker,
    KpiCard,
    EmptyState,
    SalesEvolutionChart,
    CategoryBreakdownChart,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export default class Dashboard {
  protected readonly adminAuthService = inject(AdminAuthService);
  private readonly productsAdminService = inject(ProductsAdminService);
  private readonly ordersAdminService = inject(OrdersAdminService);

  protected readonly lowStockThreshold = LOW_STOCK_THRESHOLD;
  protected readonly skeletonTiles = [1, 2, 3, 4];
  protected readonly cloudinaryUrl = cloudinaryUrl;
  protected readonly formatPrice = formatPrice;
  protected readonly categoryLabel = categoryLabel;

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

  // ── Ventas (ver tarea, punto 3) ──────────────────────────────────────────
  protected readonly dateRange = signal<DateRangeSelection>(resolveDateRangePreset('last30'));
  protected readonly granularity = signal<SalesTimeseriesGranularity>('day');
  protected readonly timeseriesMetric = signal<'grossValue' | 'approvedValue'>('approvedValue');
  protected readonly topProductsSortBy = signal<'revenue' | 'units'>('revenue');

  protected readonly salesLoading = signal(true);
  protected readonly salesError = signal<string | null>(null);
  protected readonly salesSummary = signal<SalesSummaryComparison | null>(null);
  protected readonly timeseries = signal<SalesTimeseriesPoint[]>([]);
  protected readonly byCategory = signal<SalesByCategoryPoint[]>([]);
  protected readonly topProducts = signal<TopProductPoint[]>([]);

  // ── Actividad operativa / alertas (ver tarea, puntos 3.6/3.7) ────────────
  // Deliberadamente SIN filtro de fecha - son siempre "ahora mismo" (cuántos pedidos tengo que
  // preparar hoy), no una métrica histórica que tenga sentido comparar contra el período
  // anterior. Nunca se inventan alertas: solo se muestran señales para las que ya existe un dato
  // real (`OrdersService.getStats`); "problemas de sincronización con Mercado Pago" o
  // "reembolsos pendientes" no se incluyen porque hoy no hay forma de detectarlos.
  protected readonly operationalStats = signal<OrdersStats | null>(null);

  constructor() {
    void this.load();
    void this.loadOperationalStats();

    effect(() => {
      const range = this.dateRange();
      const granularity = this.granularity();
      const sortBy = this.topProductsSortBy();
      void this.loadSales(range, granularity, sortBy);
    });
  }

  protected retry(): void {
    void this.load();
  }

  protected retrySales(): void {
    void this.loadSales(this.dateRange(), this.granularity(), this.topProductsSortBy());
  }

  protected onMetricChange(event: Event): void {
    this.timeseriesMetric.set((event.target as HTMLSelectElement).value as 'grossValue' | 'approvedValue');
  }

  protected onGranularityChange(event: Event): void {
    this.granularity.set((event.target as HTMLSelectElement).value as SalesTimeseriesGranularity);
  }

  protected onSortByChange(event: Event): void {
    this.topProductsSortBy.set((event.target as HTMLSelectElement).value as 'revenue' | 'units');
  }

  /** Variación % de cada KPI respecto del período anterior - `null` si no hay comparación
   *  posible (ver `percentChange`), nunca un número inventado. */
  protected comparisonFor(metric: keyof SalesSummary): number | null {
    const summary = this.salesSummary();
    if (!summary) return null;
    return percentChange(summary.current[metric], summary.previous[metric]);
  }

  private async loadOperationalStats(): Promise<void> {
    try {
      this.operationalStats.set(await this.ordersAdminService.getStats());
    } catch {
      // Panel secundario - si falla, simplemente no se muestra (el resto del dashboard sigue
      // funcionando con su propio manejo de error independiente).
    }
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

  private async loadSales(
    range: DateRangeSelection,
    granularity: SalesTimeseriesGranularity,
    sortBy: 'revenue' | 'units',
  ): Promise<void> {
    this.salesLoading.set(true);
    this.salesError.set(null);
    try {
      const [summary, timeseries, byCategory, topProducts] = await Promise.all([
        this.ordersAdminService.getSalesSummary(range),
        this.ordersAdminService.getSalesTimeseries(range, granularity),
        this.ordersAdminService.getSalesByCategory(range),
        this.ordersAdminService.getTopProducts(range, 10, sortBy),
      ]);
      this.salesSummary.set(summary);
      this.timeseries.set(timeseries);
      this.byCategory.set(byCategory);
      this.topProducts.set(topProducts);
    } catch {
      this.salesError.set('No pudimos cargar las métricas de ventas.');
    } finally {
      this.salesLoading.set(false);
    }
  }
}
