import { Component, computed, input } from '@angular/core';
import { SCENT_STYLE_OPTIONS } from '../../../../data/scent-styles';
import type { Product, ScentStyle } from '../../../../data/product.model';

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

/**
 * A read-only summary of taste, derived entirely from the products a user already favorited -
 * no separate preferences form to fill out. Accords are shown as single-hue magnitude bars
 * (comparing a count across a handful of categories - the textbook case for a sequential bar,
 * per the dataviz skill); styles as a secondary chip row.
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

  protected readonly styleStats = computed<readonly StyleStat[]>(() => {
    const counts = new Map<ScentStyle, number>();
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
