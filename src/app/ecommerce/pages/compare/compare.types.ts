/** One color per compared product, reused everywhere that product needs to be told apart - not
 *  `product.accent` (that's an admin-chosen, product-specific color with no "series" meaning).
 *  CSS var form, for use in `[style.--series-color]` bindings (chips, dots, legends). */
export const SERIES_COLORS = [
  'var(--color-aurora-violet)',
  'var(--color-aurora-cyan)',
  'var(--color-aurora-emerald)',
  'var(--color-aurora-teal)',
] as const;

/** Same series, as literal hex - a Chart.js canvas can't resolve a CSS custom property the way
 *  the DOM does, so chart datasets need the real color value instead of `SERIES_COLORS` above. */
export const SERIES_COLORS_HEX = ['#8b5cf6', '#06b6d4', '#10b981', '#34d399'] as const;

export interface DotRow {
  readonly name: string;
  readonly chips: readonly string[];
}

export interface MetricRow {
  readonly icon: string;
  readonly label: string;
  readonly bars: readonly { readonly pct: number; readonly displayLabel: string; readonly isBest: boolean }[];
}
