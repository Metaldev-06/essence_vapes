/** One color per compared product, reused everywhere that product needs to be told apart - not
 *  `product.accent` (that's an admin-chosen, product-specific color with no "series" meaning). */
export const SERIES_COLORS = [
  'var(--color-aurora-violet)',
  'var(--color-aurora-cyan)',
  'var(--color-aurora-emerald)',
  'var(--color-aurora-teal)',
] as const;

export interface DotRow {
  readonly name: string;
  readonly chips: readonly string[];
}

export interface MetricRow {
  readonly icon: string;
  readonly label: string;
  readonly bars: readonly { readonly pct: number; readonly displayLabel: string; readonly isBest: boolean }[];
}

export interface RadarGeometry {
  readonly rings: readonly string[];
  readonly axisLines: readonly { readonly x2: number; readonly y2: number }[];
  readonly labels: readonly { readonly x: number; readonly y: number; readonly anchor: string; readonly text: string }[];
  readonly series: readonly { readonly color: string; readonly points: string }[];
}
