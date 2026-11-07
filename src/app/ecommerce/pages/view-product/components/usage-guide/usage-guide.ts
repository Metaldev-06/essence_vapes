import { Component, computed, input } from '@angular/core';
import type { Longevity, Product, Sillage } from '../../../../data/product.model';

interface RatingBar {
  readonly label: string;
  readonly value: number;
  readonly icon?: 'primavera' | 'verano' | 'otono' | 'invierno';
}

interface OccasionTile {
  readonly label: string;
  readonly value: number;
  readonly icon: 'trabajo' | 'romantico' | 'social' | 'formal' | 'casual' | 'deporte';
}

const MAX_RATING = 5;

const SILLAGE_STEPS: readonly Sillage[] = ['intimo', 'moderado', 'fuerte', 'enorme'];

const SILLAGE_LABELS: Record<Sillage, string> = {
  intimo: 'Íntima',
  moderado: 'Moderada',
  fuerte: 'Fuerte',
  enorme: 'Enorme',
};

const LONGEVITY_STEPS: readonly Longevity[] = ['2-4h', '4-6h', '6-8h', '8-12h', '12h+'];

@Component({
  selector: 'app-usage-guide',
  imports: [],
  templateUrl: './usage-guide.html',
  styleUrl: './usage-guide.css',
})
export class UsageGuide {
  readonly product = input.required<Product>();

  protected readonly maxRating = MAX_RATING;
  protected readonly dotRange = Array.from({ length: MAX_RATING }, (_, i) => i);

  protected occasionTier(value: number): 'strong' | 'medium' | 'weak' {
    if (value >= 4) return 'strong';
    if (value >= 2) return 'medium';
    return 'weak';
  }

  protected readonly seasonBars = computed<readonly RatingBar[]>(() => {
    const season = this.product().seasonUsage;
    if (!season) {
      return [];
    }
    return [
      { label: 'Primavera', value: season.primavera, icon: 'primavera' },
      { label: 'Verano', value: season.verano, icon: 'verano' },
      { label: 'Otoño', value: season.otono, icon: 'otono' },
      { label: 'Invierno', value: season.invierno, icon: 'invierno' },
    ];
  });

  protected readonly dayBars = computed<readonly RatingBar[]>(() => {
    const day = this.product().dayUsage;
    if (!day) {
      return [];
    }
    return [
      { label: 'Día', value: day.dia },
      { label: 'Noche', value: day.noche },
    ];
  });

  protected readonly occasionTiles = computed<readonly OccasionTile[]>(() => {
    const occasions = this.product().occasions;
    if (!occasions) {
      return [];
    }
    return [
      { label: 'Trabajo', value: occasions.trabajo, icon: 'trabajo' },
      { label: 'Romántico', value: occasions.romantico, icon: 'romantico' },
      { label: 'Social', value: occasions.social, icon: 'social' },
      { label: 'Formal', value: occasions.formal, icon: 'formal' },
      { label: 'Casual', value: occasions.casual, icon: 'casual' },
      { label: 'Deporte', value: occasions.deporte, icon: 'deporte' },
    ];
  });

  protected readonly sillageSteps = SILLAGE_STEPS.map((step) => ({ id: step, label: SILLAGE_LABELS[step] }));
  protected readonly longevitySteps = LONGEVITY_STEPS.map((step) => ({ id: step, label: step }));

  protected readonly activeSillageIndex = computed(() => {
    const sillage = this.product().sillage;
    return sillage ? SILLAGE_STEPS.indexOf(sillage) : -1;
  });

  protected readonly activeLongevityIndex = computed(() => {
    const longevity = this.product().longevity;
    return longevity ? LONGEVITY_STEPS.indexOf(longevity) : -1;
  });

  protected readonly hasMoodCard = computed(() => {
    const product = this.product();
    return Boolean(product.mood || this.dayBars().length > 0);
  });

  protected readonly hasStatsRow = computed(
    () => this.seasonBars().length > 0 || this.activeSillageIndex() >= 0 || this.activeLongevityIndex() >= 0,
  );
}
