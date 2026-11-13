import { Component, computed, input } from '@angular/core';
import { ArcElement, type ChartConfiguration, DoughnutController, Legend, Tooltip } from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';

import { CATEGORY_LABELS, type ProductCategory } from '../../../ecommerce/data/product.model';
import type { SalesByCategoryPoint } from '../../data/orders-admin.service';
import { EmptyState } from '../empty-state/empty-state';

/** Colores de la dona por categoría - mismo set de acentos de marca (ver `--color-aurora-*` en
 *  `styles.css`). */
const CATEGORY_CHART_COLORS: Record<string, string> = {
  perfumes: '#8b5cf6',
  decants: '#06b6d4',
  vapes: '#10b981',
  esencias: '#34d399',
  sin_categoria: 'rgba(245, 243, 255, 0.25)',
};

export const categoryLabel = (category: string): string =>
  CATEGORY_LABELS[category as ProductCategory] ?? 'Sin categoría';

/** Gráfico de ventas por categoría (dona) - compartido por Dashboard y Reportes (ver tarea,
 *  puntos 3.4 y 4.1). Registra Chart.js a nivel de ESTE componente, no en `app.config.ts`, para
 *  que el storefront público nunca lo descargue. */
@Component({
  selector: 'app-category-breakdown-chart',
  imports: [BaseChartDirective, EmptyState],
  templateUrl: './category-breakdown-chart.html',
  styleUrl: './category-breakdown-chart.css',
  providers: [provideCharts({ registerables: [DoughnutController, ArcElement, Tooltip, Legend] })],
})
export class CategoryBreakdownChart {
  readonly points = input.required<readonly SalesByCategoryPoint[]>();
  protected readonly categoryLabel = categoryLabel;

  protected readonly chartData = computed<ChartConfiguration<'doughnut'>['data']>(() => {
    const rows = this.points();
    return {
      labels: rows.map((row) => categoryLabel(row.category)),
      datasets: [
        {
          data: rows.map((row) => row.revenueValue),
          backgroundColor: rows.map((row) => CATEGORY_CHART_COLORS[row.category] ?? '#8b5cf6'),
          borderWidth: 0,
        },
      ],
    };
  });

  /** Alternativa textual del gráfico (ver tarea, punto 7 - validación de accesibilidad) - un
   *  `<canvas>` no transmite nada a un lector de pantalla por sí solo. */
  protected readonly ariaLabel = computed(() => {
    const rows = this.points();
    if (rows.length === 0) return 'Ventas por categoría: sin datos en el período.';
    const total = rows.reduce((sum, row) => sum + row.revenueValue, 0);
    const parts = rows.map((row) => {
      const share = total > 0 ? Math.round((row.revenueValue / total) * 100) : 0;
      return `${categoryLabel(row.category)} ${share}%`;
    });
    return `Gráfico de dona: participación de ingresos por categoría - ${parts.join(', ')}.`;
  });

  protected readonly chartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: 'rgba(245, 243, 255, 0.6)', boxWidth: 12 },
      },
    },
  };
}
