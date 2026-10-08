import type {
  AccentKey,
  DayUsage,
  FragranceNotes,
  Gender,
  Longevity,
  OccasionRatings,
  ProductCategory,
  ScentStyle,
  SeasonUsage,
  Sillage,
} from '../../ecommerce/data/product.model';

/**
 * Mirrors the backend's CreateProductDto field-for-field. Deliberately NOT the storefront's
 * `readonly Product` interface - this is a mutable write payload, not a read model.
 */
export interface AdminProductInput {
  id?: string;
  brand: string;
  name: string;
  subtitle: string;
  notes: string[];
  priceValue: number;
  oldPriceValue?: number;
  badge?: string;
  accent: AccentKey;
  category: ProductCategory;
  styles: ScentStyle[];
  featured?: boolean;
  year?: number;
  origin?: string;
  gender?: Gender;
  rating?: number;
  ratingCount?: number;
  accords?: string[];
  fragranceNotes?: FragranceNotes;
  mood?: string[];
  seasonUsage?: SeasonUsage;
  dayUsage?: DayUsage;
  occasions?: OccasionRatings;
  sillage?: Sillage;
  longevity?: Longevity;
  stock?: number;
  isActive?: boolean;
}
