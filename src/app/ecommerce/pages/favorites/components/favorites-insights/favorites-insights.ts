import { Component, computed, input } from '@angular/core';
import type { Product } from '../../../../data/product.model';

interface Insight {
  readonly icon: 'drop' | 'calendar' | 'sun' | 'snow';
  readonly title: string;
  readonly description: string;
}

/** Descriptive phrase for each occasion filter card id - see `FAVORITE_FILTER_CARDS`. */
const OCCASION_PHRASES: Record<string, string> = {
  trabajo: 'el trabajo',
  romantico: 'citas románticas',
  social: 'noches de fiesta',
  casual: 'el día a día',
  formal: 'eventos formales',
  deporte: 'el gimnasio',
};

const SEASON_LABELS = {
  primavera: 'Primavera',
  verano: 'Verano',
  otono: 'Otoño',
  invierno: 'Invierno',
} as const;

/** Spanish "y" becomes "e" before a word starting with an i/hi sound (e.g. "Otoño e invierno"). */
function joinSpanishPair(first: string, second: string): string {
  const conjunction = /^(hi(?!e)|i)/i.test(second) ? 'e' : 'y';
  return `${first} ${conjunction} ${second.toLowerCase()}`;
}

/**
 * The right-hand "Tu estilo" card on `/favoritos` - plain-language read of the same aggregate
 * data `TasteProfile` charts (accords, occasions, day/night, season), derived entirely from the
 * user's own favorited products - no separate preferences form.
 */
@Component({
  selector: 'app-favorites-insights',
  imports: [],
  templateUrl: './favorites-insights.html',
  styleUrl: './favorites-insights.css',
})
export class FavoritesInsights {
  readonly products = input.required<readonly Product[]>();

  protected readonly insights = computed<readonly Insight[]>(() => {
    const products = this.products();
    if (products.length === 0) return [];

    const list: Insight[] = [];

    const accordInsight = this.buildAccordInsight(products);
    if (accordInsight) list.push(accordInsight);

    const occasionInsight = this.buildOccasionInsight(products);
    if (occasionInsight) list.push(occasionInsight);

    const dayInsight = this.buildDayInsight(products);
    if (dayInsight) list.push(dayInsight);

    const seasonInsight = this.buildSeasonInsight(products);
    if (seasonInsight) list.push(seasonInsight);

    return list;
  });

  private buildAccordInsight(products: readonly Product[]): Insight | null {
    const counts = new Map<string, number>();
    for (const product of products) {
      for (const accord of product.accords ?? []) {
        counts.set(accord, (counts.get(accord) ?? 0) + 1);
      }
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    if (top.length === 0) return null;

    const names = top.map(([label]) => label.toLowerCase());
    return {
      icon: 'drop',
      title: `Predominan fragancias ${names.join(' y ')}`,
      description: 'Te atraen las composiciones con carácter, calidez y buena fijación.',
    };
  }

  private buildOccasionInsight(products: readonly Product[]): Insight | null {
    const counts = new Map<string, number>();
    for (const product of products) {
      const occasions = product.occasions;
      if (!occasions) continue;
      for (const [id, value] of Object.entries(occasions)) {
        if (value >= 4) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => OCCASION_PHRASES[id])
      .filter((phrase): phrase is string => Boolean(phrase));
    if (top.length === 0) return null;

    const sentence = top.length === 1 ? top[0] : `${top[0]} y ${top[1]}`;
    return {
      icon: 'calendar',
      title: 'Mejores ocasiones',
      description: `Favorece ${sentence}.`,
    };
  }

  private buildDayInsight(products: readonly Product[]): Insight | null {
    let dia = 0;
    let noche = 0;
    let counted = 0;
    for (const product of products) {
      if (!product.dayUsage) continue;
      dia += product.dayUsage.dia;
      noche += product.dayUsage.noche;
      counted++;
    }
    if (counted === 0) return null;

    const description =
      noche > dia * 1.15
        ? 'Preferís usarlas de noche.'
        : dia > noche * 1.15
          ? 'Preferís usarlas de día.'
          : 'Te gustan tanto de día como de noche.';

    return { icon: 'sun', title: 'Momentos del día', description };
  }

  private buildSeasonInsight(products: readonly Product[]): Insight | null {
    const totals = { primavera: 0, verano: 0, otono: 0, invierno: 0 };
    let counted = 0;
    for (const product of products) {
      const season = product.seasonUsage;
      if (!season) continue;
      totals.primavera += season.primavera;
      totals.verano += season.verano;
      totals.otono += season.otono;
      totals.invierno += season.invierno;
      counted++;
    }
    if (counted === 0) return null;

    const top = (Object.entries(totals) as [keyof typeof totals, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .filter(([, value]) => value > 0)
      .map(([season]) => SEASON_LABELS[season]);
    if (top.length === 0) return null;

    const sentence = top.length === 1 ? top[0] : joinSpanishPair(top[0], top[1]);
    return {
      icon: 'snow',
      title: 'Estaciones favoritas',
      description: `${sentence}, donde mejor se expresan tus fragancias.`,
    };
  }
}
