import { USAGE_AXIS_ICONS } from './compare.types';

describe('USAGE_AXIS_ICONS', () => {
  it('cada estación, momento y ocasión tiene su propio ícono', () => {
    const icons = Object.values(USAGE_AXIS_ICONS);

    expect(icons).toHaveLength(12);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('usa íconos acordes a cada eje', () => {
    expect(USAGE_AXIS_ICONS).toMatchObject({
      Primavera: '🌸',
      Verano: '🏖️',
      Otoño: '🍂',
      Invierno: '❄️',
      Día: '☀️',
      Noche: '🌙',
    });
  });

  it('ya no usa el ícono genérico de calendario para las ocasiones', () => {
    expect(Object.values(USAGE_AXIS_ICONS)).not.toContain('📅');
  });
});
