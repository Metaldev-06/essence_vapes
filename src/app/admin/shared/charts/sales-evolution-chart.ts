import { Component, computed, input } from '@angular/core';
import {
  CategoryScale,
  type ChartConfiguration,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';

import { formatPrice } from '../../../ecommerce/data/format-price';
import type {
  SalesTimeseriesGranularity,
  SalesTimeseriesPoint,
} from '../../data/orders-admin.service';
import { EmptyState } from '../empty-state/empty-state';

const CHART_GRID_COLOR = 'rgba(245, 243, 255, 0.08)';
const CHART_TEXT_COLOR = 'rgba(245, 243, 255, 0.6)';

/** Gráfico de evolución de ventas (línea/área) - compartido por Dashboard y Reportes, para no
 *  duplicar el registro de Chart.js ni la configuración en dos lugares (ver tarea, puntos 3.3 y
 *  4.1). Registra Chart.js a nivel de ESTE componente (no en `app.config.ts`), para que el
 *  storefront público nunca lo descargue. */
@Component({
  selector: 'app-sales-evolution-chart',
  imports: [BaseChartDirective, EmptyState],
  templateUrl: './sales-evolution-chart.html',
  styleUrl: './sales-evolution-chart.css',
  providers: [
    provideCharts({
      registerables: [LineController, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler],
    }),
  ],
})
export class SalesEvolutionChart {
  readonly points = input.required<readonly SalesTimeseriesPoint[]>();
  readonly metric = input<'grossValue' | 'approvedValue'>('approvedValue');
  readonly granularity = input<SalesTimeseriesGranularity>('day');

  protected readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const metric = this.metric();
    const granularity = this.granularity();
    const points = this.points();
    return {
      labels: points.map((point) => this.formatBucketLabel(point.bucketStartUtc, granularity)),
      datasets: [
        {
          data: points.map((point) => point[metric]),
          label: metric === 'grossValue' ? 'Importe bruto' : 'Pagos aprobados',
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          pointRadius: 2,
          tension: 0.3,
          fill: true,
        },
      ],
    };
  });

  protected readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: CHART_TEXT_COLOR } },
      y: {
        beginAtZero: true,
        grid: { color: CHART_GRID_COLOR },
        ticks: { color: CHART_TEXT_COLOR, callback: (value) => formatPrice(Number(value)) },
      },
    },
  };

  private formatBucketLabel(bucketStartUtc: string, granularity: SalesTimeseriesGranularity): string {
    const date = new Date(bucketStartUtc);
    if (granularity === 'month') {
      return date.toLocaleDateString('es-AR', {
        month: 'short',
        year: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      });
    }
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  }
}
