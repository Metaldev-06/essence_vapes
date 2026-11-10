import type { ProductStyleOption, ScentStyle } from './product.model';

export type ScentStyleOption = ProductStyleOption<ScentStyle>;

export const SCENT_STYLE_OPTIONS: readonly ScentStyleOption[] = [
  { id: 'fresco', emoji: '🌊', label: 'Fresco' },
  { id: 'dulce', emoji: '🍬', label: 'Dulce' },
  { id: 'intenso', emoji: '🔥', label: 'Intenso' },
  { id: 'elegante', emoji: '🕊️', label: 'Elegante' },
  { id: 'nocturno', emoji: '🌙', label: 'Nocturno' },
  { id: 'citrico', emoji: '🍋', label: 'Cítrico' },
  { id: 'amaderado', emoji: '🌳', label: 'Amaderado' },
  { id: 'tropical', emoji: '🌴', label: 'Tropical' },
  { id: 'especiado', emoji: '🌶️', label: 'Especiado' },
  { id: 'gourmand', emoji: '🍯', label: 'Gourmand' },
  { id: 'floral', emoji: '🌸', label: 'Floral' },
];
