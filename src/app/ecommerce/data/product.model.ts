export type ProductCategory = 'perfumes' | 'decants' | 'vapes' | 'esencias';

export type ScentStyle = 'fresco' | 'dulce' | 'intenso' | 'elegante' | 'nocturno' | 'citrico';

export type AccentKey = 'violet' | 'cyan' | 'emerald' | 'teal';

export type SortOption = 'destacados' | 'precio-asc' | 'precio-desc' | 'nombre';

export interface Product {
  readonly id: string;
  readonly brand: string;
  readonly name: string;
  readonly subtitle: string;
  readonly notes: readonly string[];
  readonly price: string;
  readonly priceValue: number;
  readonly oldPrice?: string;
  readonly badge?: string;
  readonly accent: AccentKey;
  readonly category: ProductCategory;
  readonly styles: readonly ScentStyle[];
  readonly featured?: boolean;
}
