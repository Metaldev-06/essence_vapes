import type { ScentStyle } from './product.model';

export interface ScentStyleOption {
  readonly id: ScentStyle;
  readonly emoji: string;
  readonly label: string;
}

export const SCENT_STYLE_OPTIONS: readonly ScentStyleOption[] = [
  { id: 'fresco', emoji: '🌊', label: 'Fresco' },
  { id: 'dulce', emoji: '🍬', label: 'Dulce' },
  { id: 'intenso', emoji: '🔥', label: 'Intenso' },
  { id: 'elegante', emoji: '🕊️', label: 'Elegante' },
  { id: 'nocturno', emoji: '🌙', label: 'Nocturno' },
  { id: 'citrico', emoji: '🍋', label: 'Cítrico' },
];
