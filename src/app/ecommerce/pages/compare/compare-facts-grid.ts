/**
 * Columnas de la tabla "Resumen general" del comparador: la de etiquetas (Categoría,
 * Concentración...) y una por producto.
 *
 * Las de producto nunca tienen un ancho mínimo fijo (`minmax(0, 1fr)`): se reparten el espacio
 * que haya y el texto parte de línea dentro de su celda. Antes en escritorio eran
 * `minmax(220px, 1fr)` con una etiqueta fija de 200px: con 2 productos la tabla pedía 640px, pero
 * va al lado del gráfico radar (~550px útiles), así que la segunda columna quedaba cortada.
 *
 * - Escritorio: la etiqueta ocupa lo justo para la más larga ("CONCENTRACIÓN").
 * - Celular: etiqueta angosta fija, para dejarle el máximo lugar a los productos.
 */
export function factsGridColumns(productCount: number, isMobile: boolean): string {
  const n = Math.max(productCount, 1);
  const labelColumn = isMobile ? '72px' : 'max-content';
  return `${labelColumn} repeat(${n}, minmax(0, 1fr))`;
}
