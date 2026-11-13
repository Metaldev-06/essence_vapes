import { Component, computed, input } from '@angular/core';
import { SCENT_STYLE_OPTIONS } from '../../../../data/scent-styles';
import type { Product, ProductStyle, ScentStyle } from '../../../../data/product.model';
import {
  HorizontalBarChart,
  type BarChartPoint,
  type BarChartSeries,
} from '../../../../shared/charts/horizontal-bar-chart/horizontal-bar-chart';
import { RadarChart, type RadarSeries } from '../../../../shared/charts/radar-chart/radar-chart';

interface AccordStat {
  readonly label: string;
  readonly count: number;
  readonly pct: number;
}

interface StyleStat {
  readonly id: ScentStyle;
  readonly emoji: string;
  readonly label: string;
  readonly count: number;
}

const MAX_ACCORDS_SHOWN = 6;
const MIN_ACCORDS_FOR_RADAR = 3;
/** Literal hex de `--color-accent` (`--color-aurora-cyan` en `styles.css`) - un canvas no puede
 *  resolver una custom property como lo hace el CSS. */
const ACCENT_HEX = '#06b6d4';

/**
 * A read-only summary of taste, derived entirely from the products a user already favorited -
 * no separate preferences form to fill out. Accords are plotted both as a radar (the shape of
 * the profile at a glance) and as single-hue magnitude bars (the exact standing per accord);
 * styles as a secondary chip row.
 */
@Component({
  selector: 'app-taste-profile',
  imports: [RadarChart, HorizontalBarChart],
  templateUrl: './taste-profile.html',
  styleUrl: './taste-profile.css',
})
export class TasteProfile {
  readonly products = input.required<readonly Product[]>();

  protected readonly hasFavorites = computed(() => this.products().length > 0);

  protected readonly accordStats = computed<readonly AccordStat[]>(() => {
    const counts = new Map<string, number>();
    for (const product of this.products()) {
      for (const accord of product.accords ?? []) {
        counts.set(accord, (counts.get(accord) ?? 0) + 1);
      }
    }

    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_ACCORDS_SHOWN);
    const max = entries[0]?.[1] ?? 0;
    return entries.map(([label, count]) => ({
      label,
      count,
      pct: max > 0 ? Math.round((count / max) * 100) : 0,
    }));
  });

  /**
   * Plots `accordStats` as a radar - same data, different read (the overall shape of the
   * profile vs. the bars' exact per-accord standing). `null` below `MIN_ACCORDS_FOR_RADAR`: a
   * 2-axis "radar" is just a line, not a meaningful shape.
   */
  protected readonly radar = computed<{ labels: readonly string[]; series: readonly RadarSeries[] } | null>(() => {
    const stats = this.accordStats();
    if (stats.length < MIN_ACCORDS_FOR_RADAR) return null;
    return {
      labels: stats.map((stat) => stat.label),
      series: [{ label: 'Tus favoritos', color: ACCENT_HEX, data: stats.map((stat) => stat.pct) }],
    };
  });

  protected readonly accordBarChart = computed<{
    categories: readonly string[];
    series: readonly BarChartSeries[];
    points: readonly (readonly BarChartPoint[])[];
  }>(() => {
    const stats = this.accordStats();
    return {
      categories: stats.map((stat) => stat.label),
      series: [{ label: 'Favoritos', color: ACCENT_HEX }],
      points: [stats.map((stat) => ({ value: stat.pct, displayLabel: `${stat.count}` }))],
    };
  });

  protected readonly styleStats = computed<readonly StyleStat[]>(() => {
    const counts = new Map<ProductStyle, number>();
    for (const product of this.products()) {
      for (const style of product.styles) {
        counts.set(style, (counts.get(style) ?? 0) + 1);
      }
    }

    return SCENT_STYLE_OPTIONS.map((option) => ({ ...option, count: counts.get(option.id) ?? 0 }))
      .filter((stat) => stat.count > 0)
      .sort((a, b) => b.count - a.count);
  });
}
