import { Component, computed, input } from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type ChartConfiguration,
  type ChartType,
  type Plugin,
} from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';

export interface BarChartPoint {
  readonly value: number;
  /** Texto de tooltip a mostrar en vez del valor crudo (ej: "8-12h", "4/5") - nunca se inventa,
   *  viene siempre calculado por quien arma los datos. */
  readonly displayLabel?: string;
  /** Si es el mejor valor de su categoría - se marca con una coronita dibujada sobre la barra. */
  readonly isBest?: boolean;
}

export interface BarChartSeries {
  readonly label: string;
  /** Literal hex (`#rrggbb`) - un canvas no puede resolver `var(--...)` como lo hace el CSS. */
  readonly color: string;
}

const CHART_LABEL_COLOR = 'rgba(245, 243, 255, 0.72)';
const ROW_HEIGHT_PER_SERIES = 22;
const ROW_PADDING = 18;
const MIN_HEIGHT = 120;

/** Dibuja una coronita junto a la barra ganadora de cada categoría - sin agregar una dependencia
 *  nueva (no hace falta `chartjs-plugin-datalabels` para esto). */
const crownPlugin: Plugin<'bar'> = {
  id: 'crownBestBar',
  afterDatasetsDraw(chart) {
    const points = (chart.config.options as { crownPoints?: readonly (readonly BarChartPoint[])[] } | undefined)
      ?.crownPoints;
    if (!points) return;
    const { ctx } = chart;
    ctx.save();
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'middle';
    chart.data.datasets.forEach((_, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      const rowPoints = points[datasetIndex];
      if (!rowPoints) return;
      meta.data.forEach((element, index) => {
        if (!rowPoints[index]?.isBest) return;
        ctx.fillText('👑', element.x + 6, element.y);
      });
    });
    ctx.restore();
  },
};

/**
 * Barras horizontales agrupadas, reutilizables fuera del admin - reemplaza las barras CSS hechas
 * a mano en `/comparar` (rendimiento/cuándo usarla), "Perfil olfativo" de Favoritos y la guía de
 * uso de la ficha de producto (ver tarea del usuario: "usar Chart.js donde haya gráficos fuera
 * del admin"). Registra Chart.js a nivel de ESTE componente, no en `app.config.ts`.
 */
@Component({
  selector: 'app-horizontal-bar-chart',
  imports: [BaseChartDirective],
  templateUrl: './horizontal-bar-chart.html',
  styleUrl: './horizontal-bar-chart.css',
  providers: [
    provideCharts({ registerables: [BarController, CategoryScale, LinearScale, BarElement, Tooltip, Legend] }),
  ],
})
export class HorizontalBarChart {
  readonly categories = input.required<readonly string[]>();
  readonly series = input.required<readonly BarChartSeries[]>();
  /** `points[seriesIndex][categoryIndex]` - mismo orden que `series()`/`categories()`. */
  readonly points = input.required<readonly (readonly BarChartPoint[])[]>();
  readonly max = input<number>(100);
  readonly ariaLabel = input<string>('Gráfico de barras');
  /** En `false` cuando quien lo usa prefiere dibujar su propia leyenda (ej: con fotos de
   *  producto) en vez de la leyenda de texto+color que ofrece Chart.js. */
  readonly legend = input<boolean>(true);

  protected readonly chartType: ChartType = 'bar';
  protected readonly plugins = [crownPlugin];

  protected readonly height = computed(() => {
    const rows = this.categories().length;
    const perRow = Math.max(this.series().length, 1) * ROW_HEIGHT_PER_SERIES + ROW_PADDING;
    return Math.max(MIN_HEIGHT, rows * perRow);
  });

  protected readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => ({
    labels: [...this.categories()],
    datasets: this.series().map((serie, seriesIndex) => ({
      label: serie.label,
      data: this.points()[seriesIndex]?.map((point) => point.value) ?? [],
      backgroundColor: serie.color,
      borderRadius: 4,
      barPercentage: 0.7,
      categoryPercentage: 0.8,
    })),
  }));

  protected readonly chartOptions = computed(() => {
    const points = this.points();
    return {
      indexAxis: 'y' as const,
      responsive: true,
      maintainAspectRatio: false,
      crownPoints: points,
      plugins: {
        legend: {
          display: this.legend() && this.series().length > 1,
          position: 'bottom' as const,
          labels: { color: CHART_LABEL_COLOR, boxWidth: 10, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (context: { datasetIndex: number; dataIndex: number; dataset: { label?: string } }) => {
              const point = points[context.datasetIndex]?.[context.dataIndex];
              const value = point?.displayLabel ?? String(point?.value ?? '');
              return context.dataset.label ? `${context.dataset.label}: ${value}` : value;
            },
          },
        },
      },
      scales: {
        x: { min: 0, max: this.max(), display: false, grid: { display: false } },
        y: {
          grid: { display: false },
          ticks: { color: CHART_LABEL_COLOR, font: { size: 12, weight: 600 } },
        },
      },
    };
  });
}
