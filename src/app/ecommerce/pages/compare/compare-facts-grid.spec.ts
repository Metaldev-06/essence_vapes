import { factsGridColumns } from './compare-facts-grid';

describe('factsGridColumns', () => {
  it('en escritorio la etiqueta ocupa lo justo y los productos se reparten el resto', () => {
    expect(factsGridColumns(2, false)).toBe('max-content repeat(2, minmax(0, 1fr))');
  });

  it('las columnas de producto nunca piden un ancho mínimo fijo (que desbordaba la tarjeta)', () => {
    for (const isMobile of [false, true]) {
      for (const count of [1, 2, 3, 4]) {
        expect(factsGridColumns(count, isMobile)).not.toMatch(/minmax\(\d+px/);
      }
    }
  });

  it('en celular mantiene la etiqueta angosta', () => {
    expect(factsGridColumns(3, true)).toBe('72px repeat(3, minmax(0, 1fr))');
  });

  it('sin productos igual arma una columna', () => {
    expect(factsGridColumns(0, false)).toBe('max-content repeat(1, minmax(0, 1fr))');
  });
});
