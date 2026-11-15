import type { ProductCategory } from './product.model';

/**
 * Qué filtros de /productos tienen sentido para cada categoría - mismo espíritu que
 * `style-group.ts` (la vocabulary de estilos/sabores ya se divide así), pero para
 * Género/Capacidad/Marca. Género solo aplica a perfumes/decants (confirmado con el usuario,
 * 2026-11-13 - vapes y esencias no se marketean por género en este catálogo). Capacidad se mide
 * en ml para perfumes/decants/esencias, pero en cantidad de puffs para vapes - no hay una unidad
 * común para "todas las categorías" a la vez, por eso el filtro se oculta por completo hasta que
 * se elige una categoría puntual (mismo criterio que ya usa el filtro de estilos).
 */

export function showsGenderFilter(category: ProductCategory | 'todos'): boolean {
  return category === 'perfumes' || category === 'decants';
}

export type CapacityUnit = 'ml' | 'puffs';

export function capacityUnitForCategory(category: ProductCategory | 'todos'): CapacityUnit | null {
  if (category === 'vapes') return 'puffs';
  if (category === 'perfumes' || category === 'decants' || category === 'esencias') return 'ml';
  return null;
}

/** Texto a continuación del número en cada chip del filtro (ej: "5ml", "600 puffs"). */
export function capacitySuffixFor(unit: CapacityUnit): string {
  return unit === 'ml' ? 'ml' : ' puffs';
}

/** Clave de grupo de marcas - perfumes y decants comparten la misma (mismo universo de marcas),
 *  vapes y esencias tienen cada uno la suya propia. Usado para saber cuándo una marca
 *  seleccionada dejó de tener sentido al cambiar de categoría. */
export function brandGroupKey(category: ProductCategory | 'todos'): string {
  if (category === 'perfumes' || category === 'decants') return 'perfumes-decants';
  return category;
}

/** Cómo se nombra lo que lista el catálogo en cada categoría. "Fragancias" es SOLO para
 *  perfumes y decants (pedido del usuario, 2026-11-15): un vape o una esencia no es una
 *  fragancia, y "Todos" mezcla las cuatro categorías. */
export function catalogNounFor(category: ProductCategory | 'todos'): string {
  switch (category) {
    case 'perfumes':
    case 'decants':
      return 'fragancias';
    case 'vapes':
      return 'vapes';
    case 'esencias':
      return 'esencias';
    default:
      return 'productos';
  }
}

/** Sugerencia del estado vacío: nombra los filtros que de verdad están en pantalla - "estilos"
 *  (Fresco, Dulce...) en perfumes/decants, "sabores" (Frutal, Mentolado...) en vapes/esencias, y
 *  ninguno en "Todos", que no muestra esos botones. */
export function emptyCatalogHintFor(category: ProductCategory | 'todos'): string {
  switch (category) {
    case 'perfumes':
    case 'decants':
      return 'Probá ajustar la búsqueda, la categoría o los estilos seleccionados.';
    case 'vapes':
    case 'esencias':
      return 'Probá ajustar la búsqueda, la categoría o los sabores seleccionados.';
    default:
      return 'Probá ajustar la búsqueda o elegir otra categoría.';
  }
}
