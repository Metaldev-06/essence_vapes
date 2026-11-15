import { keepsStylesOnCategoryChange, styleGroupForCategory, styleGroupOfSelection } from './style-group';

describe('styleGroupForCategory', () => {
  it('perfumes y decants usan fragancias; vapes y esencias, sabores; "Todos", ninguno', () => {
    expect(styleGroupForCategory('perfumes')).toBe('fragrance');
    expect(styleGroupForCategory('decants')).toBe('fragrance');
    expect(styleGroupForCategory('vapes')).toBe('flavor');
    expect(styleGroupForCategory('esencias')).toBe('flavor');
    expect(styleGroupForCategory('todos')).toBe('none');
  });
});

describe('styleGroupOfSelection', () => {
  it('con una categoría puntual, es el vocabulario de esa categoría', () => {
    expect(styleGroupOfSelection('decants', ['fresco'])).toBe('fragrance');
    expect(styleGroupOfSelection('vapes', ['ice'])).toBe('flavor');
  });

  it('en "Todos" con los estilos del buscador del home, son de fragancias', () => {
    expect(styleGroupOfSelection('todos', ['amaderado', 'gourmand'])).toBe('fragrance');
  });

  it('"dulce", "cítrico" y "tropical" existen en los dos vocabularios: cuentan como fragancias', () => {
    expect(styleGroupOfSelection('todos', ['dulce', 'citrico'])).toBe('fragrance');
  });

  it('en "Todos" con estilos que solo existen en sabores, son sabores', () => {
    expect(styleGroupOfSelection('todos', ['mentolado', 'ice'])).toBe('flavor');
  });

  it('sin estilos no hay vocabulario que deducir', () => {
    expect(styleGroupOfSelection('todos', [])).toBe('none');
  });
});

describe('keepsStylesOnCategoryChange', () => {
  it('los estilos de fragancias se mantienen en perfumes y decants', () => {
    expect(keepsStylesOnCategoryChange('fragrance', 'perfumes')).toBe(true);
    expect(keepsStylesOnCategoryChange('fragrance', 'decants')).toBe(true);
  });

  it('pasar a vapes o esencias los reinicia', () => {
    expect(keepsStylesOnCategoryChange('fragrance', 'vapes')).toBe(false);
    expect(keepsStylesOnCategoryChange('fragrance', 'esencias')).toBe(false);
  });

  it('y al revés: los sabores no pasan a perfumes', () => {
    expect(keepsStylesOnCategoryChange('flavor', 'esencias')).toBe(true);
    expect(keepsStylesOnCategoryChange('flavor', 'perfumes')).toBe(false);
  });

  it('volver a "Todos" los reinicia (ahí no se ven los botones de estilo)', () => {
    expect(keepsStylesOnCategoryChange('fragrance', 'todos')).toBe(false);
  });
});
