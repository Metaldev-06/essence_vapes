import { convertToParamMap } from '@angular/router';

import { DEFAULT_PRODUCTS_FILTERS, type ProductsFiltersSnapshot } from './products-filters-store';
import {
  describeFilters,
  filtersFromShareParams,
  filtersToShareParams,
  isShareCode,
  sanitizeFilters,
} from './shared-filters';

// Lo de la captura del usuario: perfumes, Jean Paul Gaultier, masculino, dulce + especiado.
const SCREENSHOT: ProductsFiltersSnapshot = {
  ...DEFAULT_PRODUCTS_FILTERS,
  category: 'perfumes',
  brand: 'Jean Paul Gaultier',
  gender: 'masculino',
  styles: ['dulce', 'especiado'],
};

const parse = (params: Record<string, string>) => filtersFromShareParams(convertToParamMap(params));

describe('filtersToShareParams', () => {
  it('lleva solo lo que difiere del valor por defecto, con nombres legibles', () => {
    expect(filtersToShareParams(SCREENSHOT)).toEqual({
      categoria: 'perfumes',
      marca: 'Jean Paul Gaultier',
      genero: 'masculino',
      estilos: 'dulce,especiado',
    });
  });

  it('sin filtros, el link no lleva nada', () => {
    expect(filtersToShareParams(DEFAULT_PRODUCTS_FILTERS)).toEqual({});
  });

  it('incluye orden, capacidad y búsqueda cuando están puestos', () => {
    expect(
      filtersToShareParams({ ...SCREENSHOT, sort: 'precio-asc', capacityMl: 125, term: '  le male ' }),
    ).toMatchObject({ orden: 'precio-asc', capacidad: '125', buscar: 'le male' });
  });
});

describe('filtersFromShareParams', () => {
  it('lo que se compartió es exactamente lo que se abre', () => {
    const full = { ...SCREENSHOT, sort: 'nombre' as const, capacityMl: 125, term: 'elixir' };
    expect(parse(filtersToShareParams(full))).toEqual(full);
  });

  it('una URL sin parámetros de filtros no es un link compartido', () => {
    expect(parse({})).toBeNull();
    expect(parse({ utm_source: 'whatsapp' })).toBeNull();
  });

  it('ignora valores que el catálogo no ofrece', () => {
    expect(parse({ categoria: 'armas', genero: 'robot', orden: 'random', capacidad: '-5' })).toEqual(
      DEFAULT_PRODUCTS_FILTERS,
    );
  });

  it('no aplica el género donde no hay filtro de género (vapes, esencias, todos)', () => {
    expect(parse({ categoria: 'vapes', genero: 'masculino' })?.gender).toBe('todos');
    expect(parse({ genero: 'masculino' })?.gender).toBe('todos');
  });

  it('solo estilos del vocabulario de la categoría', () => {
    // "mentolado" es un sabor de vape, no un estilo de perfume.
    expect(parse({ categoria: 'perfumes', estilos: 'dulce,mentolado,inventado' })?.styles).toEqual(['dulce']);
    expect(parse({ categoria: 'vapes', estilos: 'mentolado,amaderado' })?.styles).toEqual(['mentolado']);
  });

  it('en "Todos" acepta los estilos del buscador del home', () => {
    expect(parse({ estilos: 'amaderado,gourmand' })?.styles).toEqual(['amaderado', 'gourmand']);
  });

  it('la capacidad solo con una categoría puntual', () => {
    expect(parse({ capacidad: '125' })?.capacityMl).toBeNull();
    expect(parse({ categoria: 'perfumes', capacidad: '125' })?.capacityMl).toBe(125);
  });

  it('recorta textos larguísimos y no repite estilos', () => {
    const parsed = parse({ marca: 'x'.repeat(500), buscar: 'y'.repeat(500), estilos: 'dulce,dulce' });
    expect(parsed?.brand).toHaveLength(80);
    expect(parsed?.term).toHaveLength(80);
    expect(parsed?.styles).toEqual(['dulce']);
  });
});

describe('sanitizeFilters (lo que devuelve el backend para un código)', () => {
  it('acepta los filtros guardados tal cual', () => {
    expect(sanitizeFilters({ ...SCREENSHOT })).toEqual(SCREENSHOT);
  });

  it('nunca confía en lo que llega: tipos raros o valores inválidos se ignoran', () => {
    expect(
      sanitizeFilters({
        category: 'perfumes',
        brand: 42,
        gender: ['masculino'],
        sort: null,
        styles: 'dulce',
        capacityMl: '125',
        term: { evil: true },
      }),
    ).toEqual({ ...DEFAULT_PRODUCTS_FILTERS, category: 'perfumes', capacityMl: 125 });
  });
});

describe('isShareCode', () => {
  it('reconoce el formato de los códigos cortos', () => {
    expect(isShareCode('k7Qx2m')).toBe(true);
    expect(isShareCode('')).toBe(false);
    expect(isShareCode('a b')).toBe(false);
    expect(isShareCode("x'--")).toBe(false);
    expect(isShareCode(null)).toBe(false);
  });
});

describe('describeFilters', () => {
  it('arma un resumen legible para acompañar el link', () => {
    expect(describeFilters(SCREENSHOT)).toBe('Perfumes · Jean Paul Gaultier · Masculino · Dulce, Especiado');
  });

  it('sin filtros', () => {
    expect(describeFilters(DEFAULT_PRODUCTS_FILTERS)).toBe('Todos los productos');
  });
});
