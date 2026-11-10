import type { FlavorStyle, ProductStyleOption } from './product.model';

export type FlavorStyleOption = ProductStyleOption<FlavorStyle>;

export const FLAVOR_STYLE_OPTIONS: readonly FlavorStyleOption[] = [
  { id: 'frutal', emoji: '🍓', label: 'Frutal' },
  { id: 'mentolado', emoji: '🧊', label: 'Mentolado' },
  { id: 'dulce', emoji: '🍭', label: 'Dulce' },
  { id: 'postre', emoji: '🍮', label: 'Postre' },
  { id: 'citrico', emoji: '🍋', label: 'Cítrico' },
  { id: 'tropical', emoji: '🌴', label: 'Tropical' },
  { id: 'bebidas', emoji: '🥤', label: 'Bebidas' },
  { id: 'cremoso', emoji: '🍦', label: 'Cremoso' },
  { id: 'caramelo', emoji: '🍬', label: 'Caramelo' },
  { id: 'herbal', emoji: '🍃', label: 'Herbal' },
  { id: 'tabaco', emoji: '🚬', label: 'Tabaco' },
  { id: 'ice', emoji: '❄️', label: 'Ice' },
];
