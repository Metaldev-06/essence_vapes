import { Component, computed, input } from '@angular/core';
import type { Product } from '../../../../data/product.model';

interface Tier {
  readonly step: number;
  readonly label: string;
  readonly icon: 'clock' | 'heart' | 'layers';
  readonly notes: readonly string[];
  readonly duration: string;
}

@Component({
  selector: 'app-fragrance-profile',
  imports: [],
  templateUrl: './fragrance-profile.html',
  styleUrl: './fragrance-profile.css',
})
export class FragranceProfile {
  readonly product = input.required<Product>();

  protected readonly isFlavor = computed(() => this.product().category === 'vapes');

  protected readonly tiers = computed<readonly Tier[]>(() => {
    const product = this.product();
    const flavor = this.isFlavor();
    const [flatTop, flatHeart, flatBase] = product.notes;
    const top = product.fragranceNotes?.top ?? (flatTop ? [flatTop] : []);
    const heart = product.fragranceNotes?.heart ?? (flatHeart ? [flatHeart] : []);
    const base = product.fragranceNotes?.base ?? (flatBase ? [flatBase] : []);

    return [
      {
        step: 1,
        label: flavor ? 'Primera calada' : 'Notas de salida',
        icon: 'clock',
        notes: top,
        duration: '0 - 15 min',
      },
      {
        step: 2,
        label: flavor ? 'Cuerpo' : 'Notas de corazón',
        icon: 'heart',
        notes: heart,
        duration: '15 - 60 min',
      },
      {
        step: 3,
        label: flavor ? 'Retrogusto' : 'Notas de fondo',
        icon: 'layers',
        notes: base,
        duration: '2 - 6 h',
      },
    ];
  });
}
