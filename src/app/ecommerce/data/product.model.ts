export type ProductCategory = 'perfumes' | 'decants' | 'vapes' | 'esencias';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  perfumes: 'Perfumes',
  decants: 'Decants',
  vapes: 'Vapes',
  esencias: 'Esencias',
};

export type ScentStyle = 'fresco' | 'dulce' | 'intenso' | 'elegante' | 'nocturno' | 'citrico';

export type AccentKey = 'violet' | 'cyan' | 'emerald' | 'teal';

export type SortOption = 'destacados' | 'precio-asc' | 'precio-desc' | 'nombre';

export type Gender = 'masculino' | 'femenino' | 'unisex';

export type Sillage = 'intimo' | 'moderado' | 'fuerte' | 'enorme';

export type Longevity = '2-4h' | '4-6h' | '6-8h' | '8-12h' | '12h+';

export interface FragranceNotes {
  readonly top: readonly string[];
  readonly heart: readonly string[];
  readonly base: readonly string[];
}

export interface SeasonUsage {
  readonly primavera: number;
  readonly verano: number;
  readonly otono: number;
  readonly invierno: number;
}

export interface DayUsage {
  readonly dia: number;
  readonly noche: number;
}

export interface OccasionRatings {
  readonly trabajo: number;
  readonly romantico: number;
  readonly social: number;
  readonly casual: number;
  readonly formal: number;
  readonly deporte: number;
}

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

  /** Extended profile - only curated for perfumes/decants/esencias (not applicable to vapes). */
  readonly year?: number;
  readonly origin?: string;
  readonly gender?: Gender;
  readonly rating?: number;
  readonly ratingCount?: number;
  readonly accords?: readonly string[];
  readonly fragranceNotes?: FragranceNotes;
  readonly mood?: readonly string[];
  readonly seasonUsage?: SeasonUsage;
  readonly dayUsage?: DayUsage;
  readonly occasions?: OccasionRatings;
  readonly sillage?: Sillage;
  readonly longevity?: Longevity;
}
