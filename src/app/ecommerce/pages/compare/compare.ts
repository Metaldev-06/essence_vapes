import { NgOptimizedImage } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompareService } from '../../../core/compare/compare.service';
import { SCENT_STYLE_OPTIONS } from '../../data/scent-styles';
import { CompareDotRows } from './components/compare-dot-rows/compare-dot-rows';
import { CompareMetricRows } from './components/compare-metric-rows/compare-metric-rows';
import { CompareRadarChart } from './components/compare-radar-chart/compare-radar-chart';
import { CompareStarRating } from './components/compare-star-rating/compare-star-rating';
import { SERIES_COLORS, type DotRow, type MetricRow, type RadarGeometry } from './compare.types';
import {
  CATEGORY_SINGULAR_LABELS,
  CONCENTRATION_LABELS,
  type Gender,
  type Longevity,
  type Product,
  type ProductStyle,
  type Sillage,
} from '../../data/product.model';

const GENDER_LABELS: Record<Gender, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  unisex: 'Unisex',
};

const SILLAGE_STEPS: readonly Sillage[] = ['intimo', 'moderado', 'fuerte', 'enorme'];
const SILLAGE_LABELS: Record<Sillage, string> = {
  intimo: 'Íntima',
  moderado: 'Moderada',
  fuerte: 'Fuerte',
  enorme: 'Enorme',
};
const LONGEVITY_STEPS: readonly Longevity[] = ['2-4h', '4-6h', '6-8h', '8-12h', '12h+'];

const MAX_RATING = 5;

// Keyed by plain string (not `ScentStyle`) so a vape/esencia product's flavor-style ids can be
// looked up too - `.get()` just returns `undefined` for them, same as any other unknown id.
const STYLE_META = new Map<string, (typeof SCENT_STYLE_OPTIONS)[number]>(
  SCENT_STYLE_OPTIONS.map((option) => [option.id, option]),
);

type CompareTab = 'resumen' | 'notas' | 'acordes' | 'rendimiento' | 'cuando';

interface Differentiator {
  readonly emoji: string;
  readonly label: string;
  readonly winnerIndex: number;
}

const MOBILE_BREAKPOINT_QUERY = '(max-width: 640px)';

const RADAR_CENTER = 130;
const RADAR_RADIUS = 66;
const RADAR_LABEL_RADIUS = 96;
const MAX_RADAR_AXES = 6;

@Component({
  selector: 'app-compare',
  imports: [
    RouterLink,
    NgOptimizedImage,
    CompareDotRows,
    CompareMetricRows,
    CompareRadarChart,
    CompareStarRating,
  ],
  templateUrl: './compare.html',
  styleUrl: './compare.css',
})
export default class Compare {
  protected readonly compareService = inject(CompareService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categoryLabels = CATEGORY_SINGULAR_LABELS;
  protected readonly concentrationLabels = CONCENTRATION_LABELS;
  protected readonly genderLabels = GENDER_LABELS;
  protected readonly sillageLabels = SILLAGE_LABELS;

  protected readonly activeTab = signal<CompareTab>('resumen');
  protected readonly tabs: readonly { id: CompareTab; label: string }[] = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'notas', label: 'Notas' },
    { id: 'acordes', label: 'Acordes' },
    { id: 'rendimiento', label: 'Rendimiento' },
    { id: 'cuando', label: 'Cuándo usarla' },
  ];

  /** Only the slots that have actually resolved - a still-loading one just isn't rendered yet. */
  protected readonly products = computed(() =>
    this.compareService.products().filter((product): product is Product => product !== null),
  );

  protected readonly hasEnoughToCompare = computed(() => this.products().length >= 2);
  protected readonly isPairwise = computed(() => this.products().length === 2);
  protected readonly canAddMore = computed(() => this.compareService.count() < this.compareService.maxItems);

  /** Backs `gridTemplateColumns()` below - the facts table's column widths need to shrink for
   *  real on mobile (not just via CSS `!important`, which can't safely override a dynamic
   *  `repeat(n, ...)` track count without breaking row alignment), so this tracks the viewport
   *  directly instead. `!window.matchMedia` guards SSR/non-browser environments. */
  protected readonly isMobile = signal(
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches : false,
  );

  constructor() {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const onChange = (event: MediaQueryListEvent) => this.isMobile.set(event.matches);
    query.addEventListener('change', onChange);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
  }

  protected seriesColor(index: number): string {
    return SERIES_COLORS[index % SERIES_COLORS.length];
  }

  protected remove(product: Product): void {
    this.compareService.remove(product.id, product.variantId);
  }

  protected setTab(tab: CompareTab): void {
    this.activeTab.set(tab);
  }

  /** Short, genuine highlight for a product's header card - top 2 of its own curated mood words. */
  protected highlight(product: Product): string | null {
    const mood = product.mood;
    if (!mood || mood.length === 0) return null;
    return mood.slice(0, 2).join(' y ');
  }

  protected topSeasons(product: Product): string | null {
    const season = product.seasonUsage;
    if (!season) return null;
    const labels: Record<'primavera' | 'verano' | 'otono' | 'invierno', string> = {
      primavera: 'Primavera',
      verano: 'Verano',
      otono: 'Otoño',
      invierno: 'Invierno',
    };
    const top = (Object.entries(season) as [keyof typeof labels, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .filter(([, value]) => value > 0)
      .map(([key]) => labels[key]);
    return top.length > 0 ? top.join(' · ') : null;
  }

  protected topNotes(product: Product): readonly string[] {
    const [flatTop] = product.notes;
    return product.fragranceNotes?.top ?? (flatTop ? [flatTop] : []);
  }

  protected heartNotes(product: Product): readonly string[] {
    const [, flatHeart] = product.notes;
    return product.fragranceNotes?.heart ?? (flatHeart ? [flatHeart] : []);
  }

  protected baseNotes(product: Product): readonly string[] {
    const [, , flatBase] = product.notes;
    return product.fragranceNotes?.base ?? (flatBase ? [flatBase] : []);
  }


  protected readonly topNoteRows = computed<readonly DotRow[]>(() =>
    this.products().map((p) => ({ name: p.name, chips: this.topNotes(p) })),
  );

  protected readonly heartNoteRows = computed<readonly DotRow[]>(() =>
    this.products().map((p) => ({ name: p.name, chips: this.heartNotes(p) })),
  );

  protected readonly baseNoteRows = computed<readonly DotRow[]>(() =>
    this.products().map((p) => ({ name: p.name, chips: this.baseNotes(p) })),
  );

  protected readonly accordRows = computed<readonly DotRow[]>(() =>
    this.products().map((p) => ({ name: p.name, chips: p.accords ?? [] })),
  );


  /** "Rendimiento" tab - duration/sillage as comparable bars, crowning whichever product scores
   *  highest (skipped when every compared product ties, including when only one has data). */
  protected readonly performanceRows = computed<readonly MetricRow[]>(() => {
    const products = this.products();

    const sillageIndexes = products.map((p) => (p.sillage ? SILLAGE_STEPS.indexOf(p.sillage) : -1));
    const longevityIndexes = products.map((p) => (p.longevity ? LONGEVITY_STEPS.indexOf(p.longevity) : -1));

    const rows: MetricRow[] = [];
    if (longevityIndexes.some((i) => i >= 0)) {
      rows.push(this.buildStepRow('⏱️', 'Duración', longevityIndexes, LONGEVITY_STEPS.length, (p) => p.longevity ?? '—'));
    }
    if (sillageIndexes.some((i) => i >= 0)) {
      rows.push(
        this.buildStepRow('💨', 'Proyección', sillageIndexes, SILLAGE_STEPS.length, (p) =>
          p.sillage ? SILLAGE_LABELS[p.sillage] : '—',
        ),
      );
    }
    return rows;
  });

  private buildStepRow(
    icon: string,
    label: string,
    indexes: readonly number[],
    totalSteps: number,
    displayFor: (product: Product) => string,
  ): MetricRow {
    const products = this.products();
    const max = Math.max(...indexes);
    const tie = indexes.filter((i) => i === max).length > 1 || max < 0;
    return {
      icon,
      label,
      bars: products.map((product, i) => ({
        pct: indexes[i] >= 0 ? ((indexes[i] + 1) / totalSteps) * 100 : 0,
        displayLabel: displayFor(product),
        isBest: !tie && indexes[i] === max,
      })),
    };
  }

  /** "Cuándo usarla" tab - same shape as performanceRows, one row per season/day/occasion axis. */
  protected readonly usageRows = computed<readonly MetricRow[]>(() => {
    const products = this.products();
    const rows: MetricRow[] = [];

    const seasonAxes: readonly [string, (p: Product) => number | undefined][] = [
      ['Primavera', (p) => p.seasonUsage?.primavera],
      ['Verano', (p) => p.seasonUsage?.verano],
      ['Otoño', (p) => p.seasonUsage?.otono],
      ['Invierno', (p) => p.seasonUsage?.invierno],
    ];
    for (const [label, getValue] of seasonAxes) {
      if (products.some((p) => getValue(p) !== undefined)) {
        rows.push(this.buildValueRow('❄️', label, products.map((p) => getValue(p) ?? 0)));
      }
    }

    const dayAxes: readonly [string, (p: Product) => number | undefined][] = [
      ['Día', (p) => p.dayUsage?.dia],
      ['Noche', (p) => p.dayUsage?.noche],
    ];
    for (const [label, getValue] of dayAxes) {
      if (products.some((p) => getValue(p) !== undefined)) {
        rows.push(this.buildValueRow('🌙', label, products.map((p) => getValue(p) ?? 0)));
      }
    }

    const occasionAxes: readonly [string, (p: Product) => number | undefined][] = [
      ['Trabajo', (p) => p.occasions?.trabajo],
      ['Romántico', (p) => p.occasions?.romantico],
      ['Social', (p) => p.occasions?.social],
      ['Casual', (p) => p.occasions?.casual],
      ['Formal', (p) => p.occasions?.formal],
      ['Deporte', (p) => p.occasions?.deporte],
    ];
    for (const [label, getValue] of occasionAxes) {
      if (products.some((p) => getValue(p) !== undefined)) {
        rows.push(this.buildValueRow('📅', label, products.map((p) => getValue(p) ?? 0)));
      }
    }

    return rows;
  });

  private buildValueRow(icon: string, label: string, values: readonly number[]): MetricRow {
    const max = Math.max(...values);
    const tie = values.filter((v) => v === max).length > 1 || max <= 0;
    return {
      icon,
      label,
      bars: values.map((value) => ({
        pct: (value / MAX_RATING) * 100,
        displayLabel: `${value}/5`,
        isBest: !tie && value === max,
      })),
    };
  }

  /** Multi-series radar over the accords shared/most common across the compared products. */
  protected readonly radar = computed<RadarGeometry | null>(() => {
    const products = this.products();
    if (products.length < 2) return null;

    const counts = new Map<string, number>();
    for (const product of products) {
      for (const accord of product.accords ?? []) {
        counts.set(accord, (counts.get(accord) ?? 0) + 1);
      }
    }
    const axes = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .slice(0, MAX_RADAR_AXES)
      .map(([label]) => label);
    if (axes.length < 3) return null;

    const axisCount = axes.length;
    const angleFor = (index: number) => (Math.PI * 2 * index) / axisCount - Math.PI / 2;
    const pointAt = (index: number, radius: number) => {
      const angle = angleFor(index);
      return { x: RADAR_CENTER + radius * Math.cos(angle), y: RADAR_CENTER + radius * Math.sin(angle) };
    };

    const rings = [0.33, 0.66, 1].map((factor) =>
      axes.map((_, i) => { const p = pointAt(i, RADAR_RADIUS * factor); return `${p.x},${p.y}`; }).join(' '),
    );
    const axisLines = axes.map((_, i) => pointAt(i, RADAR_RADIUS)).map(({ x, y }) => ({ x2: x, y2: y }));
    const labels = axes.map((text, i) => {
      const angle = angleFor(i);
      const cos = Math.cos(angle);
      const point = pointAt(i, RADAR_LABEL_RADIUS);
      const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
      return { x: point.x, y: point.y, anchor, text };
    });

    const series = products.map((product, productIndex) => {
      const owned = new Set(product.accords ?? []);
      const points = axes
        .map((axis, i) => {
          const point = pointAt(i, owned.has(axis) ? RADAR_RADIUS : RADAR_RADIUS * 0.12);
          return `${point.x},${point.y}`;
        })
        .join(' ');
      return { color: SERIES_COLORS[productIndex % SERIES_COLORS.length], points };
    });

    return { rings, axisLines, labels, series };
  });

  /**
   * "Diferencias clave" / "¿Cuál elegir?" - only meaningful for exactly 2 products. Every entry
   * is backed by real curated data (shared scent styles, season/day/occasion ratings), never
   * invented: an axis is skipped entirely when both products tie or neither has data for it.
   */
  protected readonly differentiators = computed<readonly Differentiator[]>(() => {
    const products = this.products();
    if (products.length !== 2) return [];
    const [a, b] = products;
    const diffs: Differentiator[] = [];

    const stylesA = new Set(a.styles);
    const stylesB = new Set(b.styles);
    const allStyles = new Set<ProductStyle>([...stylesA, ...stylesB]);
    for (const style of allStyles) {
      const inA = stylesA.has(style);
      const inB = stylesB.has(style);
      if (inA === inB) continue;
      const meta = STYLE_META.get(style);
      if (!meta) continue;
      diffs.push({ emoji: meta.emoji, label: `Más ${meta.label.toLowerCase()}`, winnerIndex: inA ? 0 : 1 });
    }

    this.pushSeasonDifferentiator(diffs, a, b, 'invierno', '❄️', 'Clima frío');
    this.pushSeasonDifferentiator(diffs, a, b, 'verano', '☀️', 'Clima cálido');

    if (a.dayUsage && b.dayUsage && a.dayUsage.noche !== b.dayUsage.noche) {
      diffs.push({
        emoji: '🌙',
        label: 'Más nocturna',
        winnerIndex: a.dayUsage.noche > b.dayUsage.noche ? 0 : 1,
      });
    }

    if (a.occasions && b.occasions && a.occasions.romantico !== b.occasions.romantico) {
      diffs.push({
        emoji: '💕',
        label: 'Más seductora',
        winnerIndex: a.occasions.romantico > b.occasions.romantico ? 0 : 1,
      });
    }

    if (a.occasions && b.occasions && a.occasions.social !== b.occasions.social) {
      diffs.push({
        emoji: '🎉',
        label: 'Más fiestera',
        winnerIndex: a.occasions.social > b.occasions.social ? 0 : 1,
      });
    }

    return diffs.slice(0, 6);
  });

  private pushSeasonDifferentiator(
    diffs: Differentiator[],
    a: Product,
    b: Product,
    key: 'invierno' | 'verano',
    emoji: string,
    label: string,
  ): void {
    const valueA = a.seasonUsage?.[key];
    const valueB = b.seasonUsage?.[key];
    if (valueA === undefined || valueB === undefined || valueA === valueB) return;
    diffs.push({ emoji, label, winnerIndex: valueA > valueB ? 0 : 1 });
  }

  /** Whichever of exactly 2 compared products wins more real differentiators - `null` on a tie
   *  (including 0 differentiators) so no crown is shown rather than an arbitrary pick. */
  protected readonly overallWinnerIndex = computed<number | null>(() => {
    const diffs = this.differentiators();
    if (diffs.length === 0) return null;
    const counts = [0, 0];
    for (const diff of diffs) counts[diff.winnerIndex]++;
    if (counts[0] === counts[1]) return null;
    return counts[0] > counts[1] ? 0 : 1;
  });

  /** Up to 3 genuine reasons to pick each product, drawn from its own winning differentiators. */
  protected pickReasons(productIndex: 0 | 1): readonly string[] {
    return this.differentiators()
      .filter((d) => d.winnerIndex === productIndex)
      .slice(0, 3)
      .map((d) => `${d.emoji} ${d.label}`);
  }

  /** The Resumen tab's 2-column split only works for exactly 2 products - with 3-4, the facts
   *  table needs more width than a fixed 50/50 split allows, so it stacks instead. */
  protected readonly resumenStacked = computed(() => this.products().length > 2);

  protected readonly gridTemplateColumns = computed(() => {
    const n = Math.max(this.products().length, 1);
    // Mobile: columnas flexibles sin piso mínimo (`minmax(0, 1fr)`) - con `minmax(220px, 1fr)`
    // la tabla pedía 640px+ de ancho mínimo (200 + 220×2) y se desbordaba en cualquier celular.
    if (this.isMobile()) return `72px repeat(${n}, minmax(0, 1fr))`;
    return `200px repeat(${n}, minmax(220px, 1fr))`;
  });
}
