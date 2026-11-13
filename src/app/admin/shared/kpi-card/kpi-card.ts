import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

type Trend = 'up' | 'down' | 'neutral';

/** Tarjeta KPI reutilizable del dashboard/reportes - valor, comparación contra el período
 *  anterior, tendencia visual, tooltip explicativo y link opcional al reporte detallado. Cuando
 *  un dato no está disponible (ej. comisión de Mercado Pago, hoy no expuesta por su API), se pasa
 *  `unavailable` en vez de inventar un valor. */
@Component({
  selector: 'app-kpi-card',
  imports: [RouterLink],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css',
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input<string>('');
  readonly tooltip = input<string>('');
  /** Variación porcentual vs. el período anterior equivalente - `null` = sin comparación posible
   *  (ej. no había datos en el período anterior). */
  readonly comparisonPercent = input<number | null>(null);
  readonly comparisonLabel = input('vs. período anterior');
  readonly reportLink = input<string | null>(null);
  readonly unavailable = input(false);

  protected readonly trend = computed<Trend>(() => {
    const percent = this.comparisonPercent();
    if (percent === null) return 'neutral';
    if (percent > 0.05) return 'up';
    if (percent < -0.05) return 'down';
    return 'neutral';
  });

  protected readonly comparisonText = computed(() => {
    const percent = this.comparisonPercent();
    if (percent === null) return null;
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
  });
}
