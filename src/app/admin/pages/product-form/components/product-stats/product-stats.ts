import { Component, computed, effect, inject, input, signal } from '@angular/core';

import { extractErrorMessage } from '../../../../data/extract-error-message';
import {
  OrdersAdminService,
  type SalesTimeseriesPoint,
  type TopProductPoint,
} from '../../../../data/orders-admin.service';
import { formatPrice } from '../../../../../ecommerce/data/format-price';
import { SalesEvolutionChart } from '../../../../shared/charts/sales-evolution-chart';
import { DateRangePicker } from '../../../../shared/date-range/date-range-picker';
import { resolveDateRangePreset, type DateRangeSelection } from '../../../../shared/date-range/date-range.model';
import { EmptyState } from '../../../../shared/empty-state/empty-state';

/** Estadísticas de UN producto (ver tarea, punto 5.4) - reutiliza los mismos endpoints de
 *  reportes (Fase 4) filtrados por `productId`, en vez de construir un sistema de métricas
 *  aparte. "Última venta" es dentro del período elegido, nunca "la última venta de toda la
 *  historia" - no hay un endpoint para eso y no se inventa. */
@Component({
  selector: 'app-product-stats',
  imports: [DateRangePicker, SalesEvolutionChart, EmptyState],
  templateUrl: './product-stats.html',
  styleUrl: './product-stats.css',
})
export class ProductStats {
  private readonly ordersAdminService = inject(OrdersAdminService);

  readonly productId = input.required<string>();

  protected readonly formatPrice = formatPrice;
  protected readonly dateRange = signal<DateRangeSelection>(resolveDateRangePreset('last90'));

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly variantRows = signal<readonly TopProductPoint[]>([]);
  protected readonly timeseries = signal<readonly SalesTimeseriesPoint[]>([]);

  protected readonly totalUnits = computed(() =>
    this.variantRows().reduce((sum, row) => sum + row.unitsSold, 0),
  );
  protected readonly totalRevenue = computed(() =>
    this.variantRows().reduce((sum, row) => sum + row.revenueValue, 0),
  );
  protected readonly currentStock = computed(() =>
    this.variantRows().reduce((sum, row) => sum + (row.currentStock ?? 0), 0),
  );
  protected readonly lastSaleLabel = computed(() => {
    const withSales = this.timeseries().filter((point) => point.approvedValue > 0);
    if (withSales.length === 0) return null;
    const last = withSales[withSales.length - 1];
    return new Date(last.bucketStartUtc).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  });

  constructor() {
    effect(() => {
      const range = this.dateRange();
      const productId = this.productId();
      void this.load(range, productId);
    });
  }

  protected retry(): void {
    void this.load(this.dateRange(), this.productId());
  }

  private async load(range: DateRangeSelection, productId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [rows, timeseries] = await Promise.all([
        this.ordersAdminService.getTopProducts(range, 50, 'revenue', 'top', { productId }),
        this.ordersAdminService.getSalesTimeseries(range, 'day', { productId }),
      ]);
      this.variantRows.set(rows);
      this.timeseries.set(timeseries);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
