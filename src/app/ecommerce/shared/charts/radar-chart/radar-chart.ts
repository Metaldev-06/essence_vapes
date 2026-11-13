import { Component, computed, input } from '@angular/core';
import {
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';

export interface RadarSeries {
  readonly label: string;
  /** Literal hex (`#rrggbb`) - a canvas 2D context can't resolve `var(--...)` the way CSS can. */
  readonly color: string;
  readonly data: readonly number[];
}

const CHART_GRID_COLOR = 'rgba(245, 243, 255, 0.12)';
const CHART_LABEL_COLOR = 'rgba(245, 243, 255, 0.65)';

const hexToRgba = (hex: string, alpha: number): string => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Radar de perfil (acordes) reutilizable fuera del admin - reemplaza el SVG hecho a mano que
 * usaban `/comparar` y "Perfil olfativo" de Favoritos (ver tarea del usuario: "usar Chart.js
 * donde haya gráficos fuera del admin"). Registra Chart.js a nivel de ESTE componente, no en
 * `app.config.ts`, para que una visita que nunca entra a esas páginas no lo descargue.
 */
@Component({
  selector: 'app-radar-chart',
  imports: [BaseChartDirective],
  templateUrl: './radar-chart.html',
  styleUrl: './radar-chart.css',
  providers: [
    provideCharts({
      registerables: [RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend],
    }),
  ],
})
export class RadarChart {
  readonly labels = input.required<readonly string[]>();
  readonly series = input.required<readonly RadarSeries[]>();
  readonly max = input<number>(100);
  readonly ariaLabel = input<string>('Radar de perfil');
  /** En `false` cuando quien lo usa prefiere dibujar su propia leyenda (ej: con fotos de
   *  producto) en vez de la leyenda de texto+color que ofrece Chart.js. */
  readonly legend = input<boolean>(true);

  protected readonly chartData = computed<ChartConfiguration<'radar'>['data']>(() => ({
    labels: [...this.labels()],
    datasets: this.series().map((serie) => ({
      label: serie.label,
      data: [...serie.data],
      borderColor: serie.color,
      backgroundColor: hexToRgba(serie.color, 0.18),
      pointBackgroundColor: serie.color,
      pointBorderColor: serie.color,
      pointRadius: 3,
      pointHoverRadius: 4,
      borderWidth: 2,
      fill: true,
    })),
  }));

  protected readonly chartOptions = computed<ChartConfiguration<'radar'>['options']>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: this.legend() && this.series().length > 1,
        position: 'bottom',
        labels: { color: CHART_LABEL_COLOR, boxWidth: 10, font: { size: 11 } },
      },
      tooltip: { enabled: true },
    },
    scales: {
      r: {
        min: 0,
        max: this.max(),
        ticks: { display: false },
        grid: { color: CHART_GRID_COLOR },
        angleLines: { color: CHART_GRID_COLOR },
        pointLabels: { color: CHART_LABEL_COLOR, font: { size: 11, weight: 600 } },
      },
    },
  }));
}
