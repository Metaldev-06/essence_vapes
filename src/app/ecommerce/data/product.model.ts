export type ProductCategory = 'perfumes' | 'decants' | 'vapes' | 'esencias';

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  perfumes: 'Perfumes',
  decants: 'Decants',
  vapes: 'Vapes',
  esencias: 'Esencias',
};

/** Singular form, for labelling a single product (e.g. the category tag on a card). */
export const CATEGORY_SINGULAR_LABELS: Record<ProductCategory, string> = {
  perfumes: 'Perfume',
  decants: 'Decant',
  vapes: 'Vape',
  esencias: 'Esencia',
};

export type ScentStyle = 'fresco' | 'dulce' | 'intenso' | 'elegante' | 'nocturno' | 'citrico';

export type SortOption = 'destacados' | 'precio-asc' | 'precio-desc' | 'nombre';

export type Gender = 'masculino' | 'femenino' | 'unisex';

export type Sillage = 'intimo' | 'moderado' | 'fuerte' | 'enorme';

export type Longevity = '2-4h' | '4-6h' | '6-8h' | '8-12h' | '12h+';

export type FragranceConcentration = 'edt' | 'edp' | 'parfum' | 'extrait' | 'colonia';

export const CONCENTRATION_LABELS: Record<FragranceConcentration, string> = {
  edt: 'Eau de Toilette (EDT)',
  edp: 'Eau de Parfum (EDP)',
  parfum: 'Parfum',
  extrait: 'Extrait de Parfum',
  colonia: 'Colonia',
};

/**
 * Nunca se asigna "autorizado" por default - lo decide un admin humano con el registro
 * sanitario real en mano. Ver Disposición ANMAT 2543/2026 y Ley 26.687 para "vapes".
 */
export type SaleAuthorizationStatus = 'no_verificado' | 'autorizado' | 'rechazado';

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

/** A single Cloudinary asset - `publicId` is what the delete endpoints key off. */
export interface MediaAsset {
  readonly url: string;
  readonly publicId: string;
}

/** The id used for a product's own (implicit) variant - never a real `ProductVariant` row. */
export const BASE_VARIANT_ID = 'base';

/** One size/variant option of a product (e.g. "5ml", "10ml"), as listed inside `Product.variants`. */
export interface VariantSummary {
  readonly id: string;
  readonly label: string | null;
  readonly priceValue: number;
  readonly price: string;
  readonly stock: number;
  readonly images: readonly MediaAsset[];
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
  readonly oldPriceValue?: number;
  readonly badge?: string;
  /** Hex color (e.g. "#8b5cf6"), chosen with a color picker in the admin panel. */
  readonly accent: string;
  readonly category: ProductCategory;
  readonly styles: readonly ScentStyle[];
  readonly featured?: boolean;
  readonly stock: number;
  readonly isActive: boolean;
  readonly images: readonly MediaAsset[];
  readonly videos: readonly MediaAsset[];

  /**
   * Which variant this particular response describes - `'base'` unless this came from the
   * exploded storefront catalog/cart, where it points at one specific `ProductVariant`. All of
   * `price`/`priceValue`/`stock`/`images` above already reflect that variant.
   */
  readonly variantId: string;
  readonly variantLabel?: string | null;
  /** Every variant this product has (always includes the base one first). */
  readonly variants: readonly VariantSummary[];

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

  /** Transparencia de producto (sección 5/6 del cumplimiento Argentina). */
  readonly countryOfOrigin?: string;
  readonly concentration?: FragranceConcentration;
  readonly netContentMl?: number;
  readonly manufacturerOrImporter?: string;
  readonly sanitaryRegistrationNumber?: string;

  /** Solo tiene sentido cuando category=decants. */
  readonly decantSourceDescription?: string;
  readonly decantVolumeMl?: number;
  readonly batchNumber?: string;
  readonly sourceProductId?: string;

  /** Solo tiene sentido cuando category=vapes - ver `requiresAgeVerification`. */
  readonly saleAuthorizationStatus: SaleAuthorizationStatus;
  readonly saleAuthorizationCode?: string;
  readonly saleAuthorizationValidFrom?: string;
  readonly saleAuthorizationValidUntil?: string;
  readonly requiresAgeVerification: boolean;
}
