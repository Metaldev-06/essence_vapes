import { NgOptimizedImage } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';

import type { DeliveryMethod, OrderStatus, PaymentStatus } from '../../../core/orders/order.model';
import {
  deliveryMethodLabel,
  orderStatusLabel,
  paymentStatusLabel,
} from '../../../core/orders/order-status-labels';
import { extractErrorMessage } from '../../data/extract-error-message';
import { cloudinaryUrl } from '../../../ecommerce/data/cloudinary-url.helper';
import { formatPrice } from '../../../ecommerce/data/format-price';
import { ProductsService } from '../../../ecommerce/data/products.service';
import type { ProductCategory } from '../../../ecommerce/data/product.model';
import {
  OrdersAdminService,
  type SalesByCategoryPoint,
  type SalesReportFilters,
  type SalesSummary,
  type SalesSummaryComparison,
  type SalesTimeseriesGranularity,
  type SalesTimeseriesPoint,
  type TopProductPoint,
  type TopProductsDirection,
  type TopProductsSortBy,
} from '../../data/orders-admin.service';
import { CategoryBreakdownChart, categoryLabel } from '../../shared/charts/category-breakdown-chart';
import { SalesEvolutionChart } from '../../shared/charts/sales-evolution-chart';
import { DateRangePicker } from '../../shared/date-range/date-range-picker';
import { resolveDateRangePreset, type DateRangeSelection } from '../../shared/date-range/date-range.model';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { KpiCard } from '../../shared/kpi-card/kpi-card';
import { percentChange } from '../dashboard/sales-kpi.helper';
import { buildTopProductsCsv } from './top-products-csv.helper';

const CATEGORY_OPTIONS: readonly ProductCategory[] = ['perfumes', 'decants', 'vapes', 'esencias'];
const ORDER_STATUS_OPTIONS: readonly OrderStatus[] = [
  'pending_payment',
  'processing',
  'paid',
  'cancelled',
  'expired',
  'refunded',
];
const PAYMENT_STATUS_OPTIONS: readonly PaymentStatus[] = [
  'pending',
  'in_process',
  'approved',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
];
const DELIVERY_METHOD_OPTIONS: readonly DeliveryMethod[] = ['home_delivery', 'pickup'];

/** `/admin/reportes` - reporte de ventas filtrable (ver tarea, punto 4.1) + sección financiera
 *  (4.2, mayormente "no disponible" - MP no expone esos datos vía Orders API, confirmado contra
 *  la documentación oficial) + rentabilidad (4.3, depende de que se haya cargado `costValue`). */
@Component({
  selector: 'app-admin-reports',
  imports: [NgOptimizedImage, DateRangePicker, KpiCard, EmptyState, SalesEvolutionChart, CategoryBreakdownChart],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export default class AdminReports {
  private readonly ordersAdminService = inject(OrdersAdminService);
  private readonly productsService = inject(ProductsService);

  protected readonly cloudinaryUrl = cloudinaryUrl;
  protected readonly formatPrice = formatPrice;
  protected readonly categoryLabel = categoryLabel;
  protected readonly orderStatusLabel = orderStatusLabel;
  protected readonly paymentStatusLabel = paymentStatusLabel;
  protected readonly deliveryMethodLabel = deliveryMethodLabel;

  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly orderStatusOptions = ORDER_STATUS_OPTIONS;
  protected readonly paymentStatusOptions = PAYMENT_STATUS_OPTIONS;
  protected readonly deliveryMethodOptions = DELIVERY_METHOD_OPTIONS;

  private readonly brandsResource = this.productsService.brands();
  protected readonly brandOptions = this.brandsResource.value;

  // ── Filtros (ver tarea, punto 4.1) ───────────────────────
  protected readonly dateRange = signal<DateRangeSelection>(resolveDateRangePreset('last30'));
  protected readonly category = signal<ProductCategory | ''>('');
  protected readonly brand = signal('');
  protected readonly orderStatus = signal<OrderStatus | ''>('');
  protected readonly paymentStatus = signal<PaymentStatus | ''>('');
  protected readonly deliveryMethod = signal<DeliveryMethod | ''>('');
  protected readonly buyer = signal('');

  protected readonly granularity = signal<SalesTimeseriesGranularity>('day');
  protected readonly timeseriesMetric = signal<'grossValue' | 'approvedValue'>('approvedValue');
  protected readonly topProductsSortBy = signal<TopProductsSortBy>('revenue');
  protected readonly topProductsDirection = signal<TopProductsDirection>('top');

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly summary = signal<SalesSummaryComparison | null>(null);
  protected readonly timeseries = signal<SalesTimeseriesPoint[]>([]);
  protected readonly byCategory = signal<SalesByCategoryPoint[]>([]);
  protected readonly topProducts = signal<TopProductPoint[]>([]);

  protected readonly activeFilters = computed<SalesReportFilters>(() => ({
    category: this.category() || undefined,
    brand: this.brand().trim() || undefined,
    orderStatus: this.orderStatus() || undefined,
    paymentStatus: this.paymentStatus() || undefined,
    deliveryMethod: this.deliveryMethod() || undefined,
    buyer: this.buyer().trim() || undefined,
  }));

  protected readonly hasActiveFilters = computed(() =>
    Object.values(this.activeFilters()).some((value) => value !== undefined),
  );

  constructor() {
    effect(() => {
      const range = this.dateRange();
      const granularity = this.granularity();
      const sortBy = this.topProductsSortBy();
      const direction = this.topProductsDirection();
      const filters = this.activeFilters();
      void this.load(range, granularity, sortBy, direction, filters);
    });
  }

  protected retry(): void {
    void this.load(
      this.dateRange(),
      this.granularity(),
      this.topProductsSortBy(),
      this.topProductsDirection(),
      this.activeFilters(),
    );
  }

  protected clearFilters(): void {
    this.category.set('');
    this.brand.set('');
    this.orderStatus.set('');
    this.paymentStatus.set('');
    this.deliveryMethod.set('');
    this.buyer.set('');
  }

  protected onCategoryChange(event: Event): void {
    this.category.set((event.target as HTMLSelectElement).value as ProductCategory | '');
  }

  protected onOrderStatusChange(event: Event): void {
    this.orderStatus.set((event.target as HTMLSelectElement).value as OrderStatus | '');
  }

  protected onPaymentStatusChange(event: Event): void {
    this.paymentStatus.set((event.target as HTMLSelectElement).value as PaymentStatus | '');
  }

  protected onDeliveryMethodChange(event: Event): void {
    this.deliveryMethod.set((event.target as HTMLSelectElement).value as DeliveryMethod | '');
  }

  protected onBrandInput(event: Event): void {
    this.brand.set((event.target as HTMLInputElement).value);
  }

  protected onBuyerInput(event: Event): void {
    this.buyer.set((event.target as HTMLInputElement).value);
  }

  protected onMetricChange(event: Event): void {
    this.timeseriesMetric.set((event.target as HTMLSelectElement).value as 'grossValue' | 'approvedValue');
  }

  protected onGranularityChange(event: Event): void {
    this.granularity.set((event.target as HTMLSelectElement).value as SalesTimeseriesGranularity);
  }

  protected onSortByChange(event: Event): void {
    this.topProductsSortBy.set((event.target as HTMLSelectElement).value as TopProductsSortBy);
  }

  protected onDirectionChange(event: Event): void {
    this.topProductsDirection.set((event.target as HTMLSelectElement).value as TopProductsDirection);
  }

  /** Variación % de cada KPI respecto del período anterior - `null` si no hay comparación
   *  posible, nunca un número inventado (ver `percentChange`). */
  protected comparisonFor(metric: keyof SalesSummary): number | null {
    const summary = this.summary();
    if (!summary) return null;
    return percentChange(summary.current[metric], summary.previous[metric]);
  }

  protected exportCsv(): void {
    const csv = buildTopProductsCsv(this.topProducts(), this.dateRange());
    this.downloadBlob(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `productos_${this.dateRange().fromUtc.slice(0, 10)}_${this.dateRange().toUtc.slice(0, 10)}.csv`,
    );
  }

  protected readonly exportingFormat = signal<'xlsx' | 'pdf' | null>(null);

  protected async exportExcel(): Promise<void> {
    await this.exportFile('xlsx', 'xlsx');
  }

  protected async exportPdf(): Promise<void> {
    await this.exportFile('pdf', 'pdf');
  }

  private async exportFile(format: 'xlsx' | 'pdf', extension: string): Promise<void> {
    this.exportingFormat.set(format);
    try {
      const blob = await this.ordersAdminService.exportTopProducts(
        this.dateRange(),
        this.topProductsSortBy(),
        this.topProductsDirection(),
        this.activeFilters(),
        format,
      );
      this.downloadBlob(
        blob,
        `productos_${this.dateRange().fromUtc.slice(0, 10)}_${this.dateRange().toUtc.slice(0, 10)}.${extension}`,
      );
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.exportingFormat.set(null);
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private async load(
    range: DateRangeSelection,
    granularity: SalesTimeseriesGranularity,
    sortBy: TopProductsSortBy,
    direction: TopProductsDirection,
    filters: SalesReportFilters,
  ): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [summary, timeseries, byCategory, topProducts] = await Promise.all([
        this.ordersAdminService.getSalesSummary(range, filters),
        this.ordersAdminService.getSalesTimeseries(range, granularity, filters),
        this.ordersAdminService.getSalesByCategory(range, filters),
        this.ordersAdminService.getTopProducts(range, 50, sortBy, direction, filters),
      ]);
      this.summary.set(summary);
      this.timeseries.set(timeseries);
      this.byCategory.set(byCategory);
      this.topProducts.set(topProducts);
    } catch {
      this.error.set('No pudimos cargar el reporte.');
    } finally {
      this.loading.set(false);
    }
  }
}
