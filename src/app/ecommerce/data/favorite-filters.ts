import type { Product } from './product.model';

export type FavoriteFilterGroup = 'momento' | 'estacion' | 'ocasion';

export interface FavoriteFilterCard {
  readonly id: string;
  readonly emoji: string;
  readonly label: string;
  readonly group: FavoriteFilterGroup;
  readonly matches: (product: Product) => boolean;
}

export const FAVORITE_FILTER_GROUP_LABELS: Record<FavoriteFilterGroup, string> = {
  momento: 'Momento del día',
  estacion: 'Estación',
  ocasion: 'Ocasión',
};

/** A product "fits" a card when it scores at least this well (scale is 0-5) on that attribute. */
const FIT_THRESHOLD = 4;

/**
 * Every card maps directly to a rating already curated on the product (seasonUsage, dayUsage,
 * occasions) - no new taxonomy invented, just exposed as clickable filters over that same data.
 */
export const FAVORITE_FILTER_CARDS: readonly FavoriteFilterCard[] = [
  {
    id: 'dia',
    emoji: '☀️',
    label: 'Para el día',
    group: 'momento',
    matches: (p) => (p.dayUsage?.dia ?? 0) >= FIT_THRESHOLD,
  },
  {
    id: 'noche',
    emoji: '🌙',
    label: 'Para la noche',
    group: 'momento',
    matches: (p) => (p.dayUsage?.noche ?? 0) >= FIT_THRESHOLD,
  },
  {
    id: 'primavera',
    emoji: '🌸',
    label: 'Primavera',
    group: 'estacion',
    matches: (p) => (p.seasonUsage?.primavera ?? 0) >= FIT_THRESHOLD,
  },
  {
    id: 'verano',
    emoji: '🏖️',
    label: 'Verano',
    group: 'estacion',
    matches: (p) => (p.seasonUsage?.verano ?? 0) >= FIT_THRESHOLD,
  },
  {
    id: 'otono',
    emoji: '🍂',
    label: 'Otoño',
    group: 'estacion',
    matches: (p) => (p.seasonUsage?.otono ?? 0) >= FIT_THRESHOLD,
  },
  {
    id: 'invierno',
    emoji: '❄️',
    label: 'Invierno',
    group: 'estacion',
    matches: (p) => (p.seasonUsage?.invierno ?? 0) >= FIT_THRESHOLD,
  },
  {
    id: 'trabajo',
    emoji: '💼',
    label: 'Para el trabajo',
    group: 'ocasion',
    matches: (p) => (p.occasions?.trabajo ?? 0) >= FIT_THRESHOLD,
  },
  {
    id: 'romantico',
    emoji: '💕',
    label: 'Romántico',
    group: 'ocasion',
    matches: (p) => (p.occasions?.romantico ?? 0) >= FIT_THRESHOLD,
  },
  {
    id: 'social',
    emoji: '🎉',
    label: 'Noche de fiesta',
    group: 'ocasion',
    matches: (p) => (p.occasions?.social ?? 0) >= FIT_THRESHOLD,
  },
  {
    id: 'casual',
    emoji: '👕',
    label: 'Para el día a día',
    group: 'ocasion',
    matches: (p) => (p.occasions?.casual ?? 0) >= FIT_THRESHOLD,
  },
  {
    id: 'formal',
    emoji: '🎩',
    label: 'Eventos formales',
    group: 'ocasion',
    matches: (p) => (p.occasions?.formal ?? 0) >= FIT_THRESHOLD,
  },
  {
    id: 'deporte',
    emoji: '🏋️',
    label: 'Para el gym',
    group: 'ocasion',
    matches: (p) => (p.occasions?.deporte ?? 0) >= FIT_THRESHOLD,
  },
];
