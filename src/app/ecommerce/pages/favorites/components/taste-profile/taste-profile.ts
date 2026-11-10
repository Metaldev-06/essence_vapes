import { Component, computed, input } from '@angular/core';
import { SCENT_STYLE_OPTIONS } from '../../../../data/scent-styles';
import type { Product, ProductStyle, ScentStyle } from '../../../../data/product.model';

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

interface RadarGeometry {
  readonly polygonPoints: string;
  readonly rings: readonly string[];
  readonly axes: readonly { readonly x2: number; readonly y2: number }[];
  readonly labels: readonly {
    readonly x: number;
    readonly y: number;
    readonly anchor: 'start' | 'middle' | 'end';
    readonly text: string;
  }[];
}

const RADAR_CENTER = 130;
const RADAR_RADIUS = 82;
const RADAR_LABEL_RADIUS = 114;

/**
 * A read-only summary of taste, derived entirely from the products a user already favorited -
 * no separate preferences form to fill out. Accords are plotted both as a radar (the shape of
 * the profile at a glance) and as single-hue magnitude bars (the exact standing per accord);
 * styles as a secondary chip row.
 */
@Component({
  selector: 'app-taste-profile',
  imports: [],
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
  protected readonly radar = computed<RadarGeometry | null>(() => {
    const stats = this.accordStats();
    if (stats.length < MIN_ACCORDS_FOR_RADAR) return null;

    const axisCount = stats.length;
    const angleFor = (index: number) => (Math.PI * 2 * index) / axisCount - Math.PI / 2;
    const pointAt = (index: number, radius: number) => {
      const angle = angleFor(index);
      return { x: RADAR_CENTER + radius * Math.cos(angle), y: RADAR_CENTER + radius * Math.sin(angle) };
    };

    const polygonPoints = stats
      .map((stat, i) => {
        const point = pointAt(i, RADAR_RADIUS * (stat.pct / 100));
        return `${point.x},${point.y}`;
      })
      .join(' ');

    const rings = [0.33, 0.66, 1].map((factor) =>
      stats
        .map((_, i) => {
          const point = pointAt(i, RADAR_RADIUS * factor);
          return `${point.x},${point.y}`;
        })
        .join(' '),
    );

    const axes = stats.map((_, i) => pointAt(i, RADAR_RADIUS)).map(({ x, y }) => ({ x2: x, y2: y }));

    const labels = stats.map((stat, i) => {
      const angle = angleFor(i);
      const cos = Math.cos(angle);
      const point = pointAt(i, RADAR_LABEL_RADIUS);
      const anchor: 'start' | 'middle' | 'end' = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
      return { x: point.x, y: point.y, anchor, text: stat.label };
    });

    return { polygonPoints, rings, axes, labels };
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
