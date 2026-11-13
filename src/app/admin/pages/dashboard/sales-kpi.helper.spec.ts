import { percentChange } from './sales-kpi.helper';

describe('percentChange', () => {
  it('calcula el aumento porcentual normal', () => {
    expect(percentChange(150, 100)).toBe(50);
  });

  it('calcula la baja porcentual normal', () => {
    expect(percentChange(50, 100)).toBe(-50);
  });

  it('período anterior y actual ambos en cero - 0%, no "sin dato"', () => {
    expect(percentChange(0, 0)).toBe(0);
  });

  it('período anterior en cero y el actual con ventas - sin comparación posible (null)', () => {
    expect(percentChange(500, 0)).toBeNull();
  });

  it('ambos períodos iguales - 0%', () => {
    expect(percentChange(200, 200)).toBe(0);
  });
});
