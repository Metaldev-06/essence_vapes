import { FLAVOR_STYLE_OPTIONS } from './flavor-styles';
import type { ProductCategory, ProductStyleOption } from './product.model';
import { SCENT_STYLE_OPTIONS } from './scent-styles';

export type StyleGroup = 'fragrance' | 'flavor' | 'none';

/** Perfumes/decants use the fragrance vocabulary (`ScentStyle`); vapes/esencias use flavors (`FlavorStyle`). */
export function styleGroupForCategory(category: ProductCategory | 'todos' | ''): StyleGroup {
  if (category === 'perfumes' || category === 'decants') return 'fragrance';
  if (category === 'vapes' || category === 'esencias') return 'flavor';
  return 'none';
}

const FRAGRANCE_STYLE_IDS = new Set<string>(SCENT_STYLE_OPTIONS.map((option) => option.id));
const FLAVOR_STYLE_IDS = new Set<string>(FLAVOR_STYLE_OPTIONS.map((option) => option.id));

/**
 * A qué vocabulario pertenecen los estilos elegidos. Por la categoría, si tiene uno. En "Todos"
 * (adonde lleva el buscador "Encontrá tu esencia" del home, con estilos de fragancias) se deduce de
 * los propios estilos - fragancias primero: "dulce", "cítrico" y "tropical" existen en los dos
 * vocabularios, y el único lugar que deja estilos en "Todos" es ese buscador, que es de fragancias.
 */
export function styleGroupOfSelection(
  category: ProductCategory | 'todos' | '',
  styles: readonly string[],
): StyleGroup {
  const fromCategory = styleGroupForCategory(category);
  if (fromCategory !== 'none' || styles.length === 0) return fromCategory;
  if (styles.every((style) => FRAGRANCE_STYLE_IDS.has(style))) return 'fragrance';
  if (styles.every((style) => FLAVOR_STYLE_IDS.has(style))) return 'flavor';
  return 'none';
}

/**
 * ¿Siguen valiendo los estilos elegidos al pasar a `nextCategory`? Sí mientras la categoría nueva
 * use el MISMO vocabulario que esos estilos: perfumes ↔ decants, o de "Todos" (con los estilos del
 * buscador del home) a perfumes/decants. No al pasar al otro vocabulario (fragancias ↔ sabores):
 * aunque "dulce" exista en los dos, un vape no se filtra con estilos de perfume. Tampoco al volver
 * a "Todos", que no muestra los botones de estilo.
 */
export function keepsStylesOnCategoryChange(
  selectionGroup: StyleGroup,
  nextCategory: ProductCategory | 'todos' | '',
): boolean {
  const next = styleGroupForCategory(nextCategory);
  return next !== 'none' && next === selectionGroup;
}

export function styleOptionsForGroup(group: StyleGroup): readonly ProductStyleOption[] {
  switch (group) {
    case 'fragrance':
      return SCENT_STYLE_OPTIONS;
    case 'flavor':
      return FLAVOR_STYLE_OPTIONS;
    case 'none':
      return [];
  }
}
