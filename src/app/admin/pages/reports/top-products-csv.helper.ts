import { categoryLabel } from '../../shared/charts/category-breakdown-chart';
import type { TopProductPoint } from '../../data/orders-admin.service';
import type { DateRangeSelection } from '../../shared/date-range/date-range.model';

const escapeCsvField = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * CSV de la tabla de productos del reporte (ver tarea, punto 4.4) - `points` ya viene filtrado
 * por los filtros activos del reporte, así que el CSV los respeta automáticamente. Los importes
 * van como NÚMEROS crudos (pesos, no strings formateados como "$1.234") - pedido explícito de la
 * tarea. Incluye fecha de generación, período y moneda como comentarios arriba del encabezado.
 */
export const buildTopProductsCsv = (
  points: readonly TopProductPoint[],
  range: DateRangeSelection,
  generatedAt: Date = new Date(),
): string => {
  const lines: string[] = [
    `# Generado: ${generatedAt.toISOString()}`,
    `# Período: ${range.label} (${range.fromUtc} a ${range.toUtc})`,
    `# Moneda: ARS`,
    [
      'Producto',
      'Variante',
      'Marca',
      'Categoria',
      'Unidades vendidas',
      'Ingresos',
      'Participacion %',
      'Margen',
      'Margen %',
      'Stock actual',
    ].join(','),
  ];

  for (const point of points) {
    lines.push(
      [
        escapeCsvField(point.productName),
        escapeCsvField(point.variantLabel ?? ''),
        escapeCsvField(point.brand ?? ''),
        escapeCsvField(point.category ? categoryLabel(point.category) : ''),
        String(point.unitsSold),
        String(point.revenueValue),
        point.sharePercent.toFixed(2),
        point.marginValue != null ? String(point.marginValue) : '',
        point.marginPercent != null ? point.marginPercent.toFixed(2) : '',
        point.currentStock != null ? String(point.currentStock) : '',
      ].join(','),
    );
  }

  return lines.join('\n');
};
