import { buildTopProductsCsv } from './top-products-csv.helper';
import { resolveDateRangePreset } from '../../shared/date-range/date-range.model';

describe('buildTopProductsCsv', () => {
  const range = resolveDateRangePreset('last30');

  it('incluye las líneas de metadata y el encabezado aunque no haya filas', () => {
    const csv = buildTopProductsCsv([], range, new Date('2026-11-12T00:00:00.000Z'));
    const lines = csv.split('\n');
    expect(lines[0]).toBe('# Generado: 2026-11-12T00:00:00.000Z');
    expect(lines[1]).toContain('# Período:');
    expect(lines[2]).toBe('# Moneda: ARS');
    expect(lines[3]).toBe(
      'Producto,Variante,Marca,Categoria,Unidades vendidas,Ingresos,Participacion %,Margen,Margen %,Stock actual',
    );
    expect(lines).toHaveLength(4);
  });

  it('los importes van como números crudos, no strings formateados', () => {
    const csv = buildTopProductsCsv(
      [
        {
          productId: 'p1',
          variantId: 'base',
          productName: 'Sauvage',
          variantLabel: null,
          category: 'perfumes',
          unitsSold: 3,
          revenueValue: 25500,
          sharePercent: 50,
          currentStock: 10,
          imageUrl: null,
          brand: 'Dior',
          marginValue: 10000,
          marginPercent: 39.2156,
        },
      ],
      range,
    );
    const dataLine = csv.split('\n')[4];
    expect(dataLine).toBe('Sauvage,,Dior,Perfumes,3,25500,50.00,10000,39.22,10');
  });

  it('escapa campos con comas o comillas', () => {
    const csv = buildTopProductsCsv(
      [
        {
          productId: 'p1',
          variantId: 'base',
          productName: 'Producto, con coma',
          variantLabel: '5ml "mini"',
          category: null,
          unitsSold: 1,
          revenueValue: 100,
          sharePercent: 100,
          currentStock: null,
          imageUrl: null,
          brand: null,
          marginValue: null,
          marginPercent: null,
        },
      ],
      range,
    );
    const dataLine = csv.split('\n')[4];
    expect(dataLine).toBe('"Producto, con coma","5ml ""mini""",,,1,100,100.00,,,');
  });
});
