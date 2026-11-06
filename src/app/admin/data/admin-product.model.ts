import type {
  DayUsage,
  FragranceConcentration,
  FragranceNotes,
  Gender,
  Longevity,
  OccasionRatings,
  ProductCategory,
  SaleAuthorizationStatus,
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
  variantLabel?: string;
  notes: string[];
  priceValue: number;
  oldPriceValue?: number;
  badge?: string | null;
  accent: string;
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

  /** Transparencia de producto. */
  countryOfOrigin?: string;
  concentration?: FragranceConcentration;
  netContentMl?: number;
  manufacturerOrImporter?: string;
  sanitaryRegistrationNumber?: string;

  /** Solo category=decants. */
  decantSourceDescription?: string;
  decantVolumeMl?: number;
  batchNumber?: string;
  sourceProductId?: string;

  /** Solo category=vapes - el admin nunca debería poder mandar "autorizado" sin un registro real. */
  saleAuthorizationStatus?: SaleAuthorizationStatus;
  saleAuthorizationCode?: string;
}

/** Write payload for the variant-specific endpoints - mirrors the backend's Create/UpdateVariantDto. */
export interface AdminVariantInput {
  label: string;
  priceValue: number;
  stock?: number;
  sortOrder?: number;
  featured?: boolean;
}

/**
 * Mirrors the backend's FragranceAiSuggestion. Only facts about the fragrance the AI can
 * plausibly know - price, stock, category, accent, images stay out and must be filled in
 * manually. `sources`/`unconfirmed` are review metadata, never written into the product.
 */
export interface AiProductSuggestion {
  subtitle?: string;
  notes?: string[];
  accords?: string[];
  fragranceNotes?: FragranceNotes;
  mood?: string[];
  year?: number;
  origin?: string;
  gender?: Gender;
  sillage?: Sillage;
  longevity?: Longevity;
  rating?: number;
  ratingCount?: number;
  seasonUsage?: SeasonUsage;
  dayUsage?: DayUsage;
  occasions?: OccasionRatings;
  fuentes: string[];
  datosNoConfirmados: string[];
}

/** One candidate edition to disambiguate (e.g. "Donna" vs "Uomo") before fetching the ficha. */
export interface AiProductCandidate {
  label: string;
  brand: string;
  name: string;
}

export type AiLookupResult =
  | { status: 'ambiguous'; candidates: AiProductCandidate[] }
  | { status: 'ok'; suggestion: AiProductSuggestion };
