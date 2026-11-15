import type { ParamMap } from '@angular/router';

import { capacitySuffixFor, capacityUnitForCategory, showsGenderFilter } from './catalog-filter-groups';
import { FLAVOR_STYLE_OPTIONS } from './flavor-styles';
import { CATEGORY_LABELS, type Gender, type ProductCategory, type ProductStyle, type SortOption } from './product.model';
import { DEFAULT_PRODUCTS_FILTERS, type ProductsFiltersSnapshot } from './products-filters-store';
import { SCENT_STYLE_OPTIONS } from './scent-styles';
import { styleGroupForCategory, styleOptionsForGroup } from './style-group';

/**
 * Link para compartir los filtros del catálogo.
 *
 * Los filtros NO viven en la URL (están en `ProductsFiltersStore`). El link compartido solo los
 * lleva como "entrada": `/productos?categoria=perfumes&marca=...`. Al abrirlo, el catálogo los
 * aplica una vez, los guarda como siempre y limpia la URL. Nombres en español y legibles, y solo
 * lo que difiere del valor por defecto: el link queda corto y se entiende a simple vista.
 */
export const SHARE_PARAMS = {
  category: 'categoria',
  brand: 'marca',
  gender: 'genero',
  styles: 'estilos',
  capacity: 'capacidad',
  sort: 'orden',
  term: 'buscar',
} as const;

const CATEGORIES: readonly ProductCategory[] = ['perfumes', 'decants', 'vapes', 'esencias'];
const GENDERS: readonly Gender[] = ['masculino', 'femenino', 'unisex'];
const SORTS: readonly SortOption[] = ['destacados', 'precio-asc', 'precio-desc', 'nombre'];
const MAX_TEXT_LENGTH = 80;
const MAX_STYLES = 12;

const GENDER_LABELS: Record<Gender, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  unisex: 'Unisex',
};

/** Los filtros actuales como parámetros del link (solo los que difieren del valor por defecto). */
export function filtersToShareParams(filters: ProductsFiltersSnapshot): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.category !== 'todos') params[SHARE_PARAMS.category] = filters.category;
  if (filters.brand !== 'todas') params[SHARE_PARAMS.brand] = filters.brand;
  if (filters.gender !== 'todos') params[SHARE_PARAMS.gender] = filters.gender;
  if (filters.styles.length > 0) params[SHARE_PARAMS.styles] = filters.styles.join(',');
  if (filters.capacityMl !== null) params[SHARE_PARAMS.capacity] = String(filters.capacityMl);
  if (filters.sort !== DEFAULT_PRODUCTS_FILTERS.sort) params[SHARE_PARAMS.sort] = filters.sort;
  const term = filters.term.trim();
  if (term) params[SHARE_PARAMS.term] = term;
  return params;
}

/** Parámetro del link corto: `/productos?c=k7Qx2m` (ver `SharedFiltersApi`). */
export const SHARE_CODE_PARAM = 'c';

/** Formato de un código de link corto (el backend genera 6 caracteres alfanuméricos). */
export function isShareCode(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9]{4,12}$/.test(value);
}

/** Lo que llega de afuera (un link largo, o lo que guardó el backend para un código): cualquier cosa. */
export interface RawFilters {
  readonly category?: unknown;
  readonly brand?: unknown;
  readonly gender?: unknown;
  readonly sort?: unknown;
  readonly styles?: unknown;
  readonly capacityMl?: unknown;
  readonly term?: unknown;
}

/**
 * Filtros válidos a partir de cualquier cosa que venga de afuera. Un link armado a mano o
 * manipulado nunca mete algo que el catálogo no ofrece (una categoría inexistente, el género en
 * vapes, un estilo de perfume en esencias, un texto enorme...): lo que no es válido se ignora.
 */
export function sanitizeFilters(raw: RawFilters): ProductsFiltersSnapshot {
  const category = CATEGORIES.find((option) => option === raw.category) ?? 'todos';

  const gender = showsGenderFilter(category)
    ? (GENDERS.find((option) => option === raw.gender) ?? 'todos')
    : 'todos';

  const sort = SORTS.find((option) => option === raw.sort) ?? DEFAULT_PRODUCTS_FILTERS.sort;

  // Solo estilos del vocabulario de la categoría. En "Todos" vale cualquiera de los dos (ahí deja
  // los suyos el buscador "Encontrá tu esencia" del home).
  const group = styleGroupForCategory(category);
  const allowedStyles = new Set<string>(
    (group === 'none' ? [...SCENT_STYLE_OPTIONS, ...FLAVOR_STYLE_OPTIONS] : styleOptionsForGroup(group)).map(
      (option) => option.id,
    ),
  );
  const rawStyles = Array.isArray(raw.styles) ? raw.styles : [];
  const styles = Array.from(
    new Set(
      rawStyles
        .filter((style): style is string => typeof style === 'string')
        .map((style) => style.trim())
        .filter((style) => allowedStyles.has(style)),
    ),
  ).slice(0, MAX_STYLES) as ProductStyle[];

  // La capacidad solo tiene sentido con una categoría puntual (ml o puffs, ver `capacityUnitFor`).
  const capacity = Number(raw.capacityMl);
  const capacityMl =
    capacityUnitForCategory(category) && Number.isInteger(capacity) && capacity > 0 && capacity <= 100_000
      ? capacity
      : null;

  return {
    term: cleanText(raw.term),
    category,
    brand: cleanText(raw.brand) || 'todas',
    gender,
    sort,
    styles,
    capacityMl,
  };
}

/** Los filtros de un link largo (`?categoria=...`), o `null` si la URL no trae ninguno. */
export function filtersFromShareParams(params: ParamMap): ProductsFiltersSnapshot | null {
  const hasAny = Object.values(SHARE_PARAMS).some((name) => params.has(name));
  if (!hasAny) return null;

  return sanitizeFilters({
    category: params.get(SHARE_PARAMS.category),
    brand: params.get(SHARE_PARAMS.brand),
    gender: params.get(SHARE_PARAMS.gender),
    sort: params.get(SHARE_PARAMS.sort),
    styles: (params.get(SHARE_PARAMS.styles) ?? '').split(','),
    capacityMl: params.get(SHARE_PARAMS.capacity),
    term: params.get(SHARE_PARAMS.term),
  });
}

/** `true` si hay algún filtro aplicado (sin filtros, se comparte `/productos` a secas). */
export function hasActiveFilters(filters: ProductsFiltersSnapshot): boolean {
  return Object.keys(filtersToShareParams(filters)).length > 0;
}

/** Resumen legible para el texto que acompaña al link ("Perfumes · Jean Paul Gaultier · ..."). */
export function describeFilters(filters: ProductsFiltersSnapshot): string {
  const styleLabels = new Map<string, string>(
    [...SCENT_STYLE_OPTIONS, ...FLAVOR_STYLE_OPTIONS].map((option) => [option.id, option.label]),
  );
  const unit = capacityUnitForCategory(filters.category);
  const parts = [
    filters.category === 'todos' ? 'Todos los productos' : CATEGORY_LABELS[filters.category],
    filters.brand !== 'todas' ? filters.brand : null,
    filters.gender !== 'todos' ? GENDER_LABELS[filters.gender] : null,
    filters.styles.length > 0 ? filters.styles.map((style) => styleLabels.get(style) ?? style).join(', ') : null,
    filters.capacityMl !== null && unit ? `${filters.capacityMl}${capacitySuffixFor(unit)}` : null,
    filters.term.trim() ? `"${filters.term.trim()}"` : null,
  ];
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}

/**
 * Copia un texto al portapapeles. Usa la API del portapapeles y, si el navegador no la tiene o la
 * bloquea, el método viejo (un campo de texto temporal + "copiar"). `false` si no pudo.
 */
export async function copyToClipboard(text: string, document: Document): Promise<boolean> {
  try {
    await document.defaultView!.navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* Sin API del portapapeles: se prueba el método viejo. */
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function cleanText(value: unknown): string {
  return (typeof value === 'string' ? value : '').trim().slice(0, MAX_TEXT_LENGTH);
}
