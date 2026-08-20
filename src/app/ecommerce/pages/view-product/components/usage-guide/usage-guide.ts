import { Component, computed, input } from '@angular/core';
import type { Product } from '../../../../data/product.model';

interface RatingBar {
  readonly label: string;
  readonly value: number;
  readonly icon?: 'primavera' | 'verano' | 'otono' | 'invierno' | 'dia' | 'noche';
}

const MAX_RATING = 5;

@Component({
  selector: 'app-usage-guide',
  imports: [],
  templateUrl: './usage-guide.html',
  styleUrl: './usage-guide.css',
})
export class UsageGuide {
  readonly product = input.required<Product>();

  protected readonly maxRating = MAX_RATING;

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
      { label: 'Día', value: day.dia, icon: 'dia' },
      { label: 'Noche', value: day.noche, icon: 'noche' },
    ];
  });

  protected readonly occasionBars = computed<readonly RatingBar[]>(() => {
    const occasions = this.product().occasions;
    if (!occasions) {
      return [];
    }
    return [
      { label: 'Trabajo', value: occasions.trabajo },
      { label: 'Romántico', value: occasions.romantico },
      { label: 'Social', value: occasions.social },
      { label: 'Casual', value: occasions.casual },
      { label: 'Formal', value: occasions.formal },
      { label: 'Deporte', value: occasions.deporte },
    ];
  });
}
