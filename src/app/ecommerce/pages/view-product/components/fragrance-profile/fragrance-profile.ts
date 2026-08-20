import { Component, computed, input } from '@angular/core';
import { ACCENT_VARS } from '../../../../data/accent';
import type { Product } from '../../../../data/product.model';

interface Tier {
  readonly step: number;
  readonly label: string;
  readonly notes: readonly string[];
  readonly duration: string;
  readonly description: string;
  readonly barWidth: string;
}

@Component({
  selector: 'app-fragrance-profile',
  imports: [],
  templateUrl: './fragrance-profile.html',
  styleUrl: './fragrance-profile.css',
})
export class FragranceProfile {
  readonly product = input.required<Product>();

  protected readonly accentVar = computed(() => ACCENT_VARS[this.product().accent]);

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
        notes: top,
        duration: '0-15 min',
        description: flavor
          ? 'Lo que se percibe apenas empezás a vapear.'
          : 'Lo primero que se siente al aplicar la fragancia.',
        barWidth: '38%',
      },
      {
        step: 2,
        label: flavor ? 'Cuerpo' : 'Notas de corazón',
        notes: heart,
        duration: '15-60 min',
        description: flavor
          ? 'El sabor principal, una vez que se estabiliza.'
          : 'El corazón de la fragancia, cuando se asienta sobre la piel.',
        barWidth: '68%',
      },
      {
        step: 3,
        label: flavor ? 'Retrogusto' : 'Notas de fondo',
        notes: base,
        duration: '2-6 h',
        description: flavor
          ? 'Lo que queda después de exhalar.'
          : 'La base que perdura, la que más tiempo se mantiene.',
        barWidth: '100%',
      },
    ];
  });
}
