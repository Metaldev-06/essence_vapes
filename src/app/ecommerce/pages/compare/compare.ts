import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompareService } from '../../../core/compare/compare.service';
import {
  CATEGORY_SINGULAR_LABELS,
  CONCENTRATION_LABELS,
  type Gender,
  type Product,
  type Sillage,
} from '../../data/product.model';

const GENDER_LABELS: Record<Gender, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  unisex: 'Unisex',
};

const SILLAGE_LABELS: Record<Sillage, string> = {
  intimo: 'Íntimo',
  moderado: 'Moderado',
  fuerte: 'Fuerte',
  enorme: 'Enorme',
};

const MAX_RATING = 5;

interface UsageBar {
  readonly label: string;
  readonly value: number;
}

@Component({
  selector: 'app-compare',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './compare.html',
  styleUrl: './compare.css',
})
export default class Compare {
  protected readonly compareService = inject(CompareService);

  protected readonly categoryLabels = CATEGORY_SINGULAR_LABELS;
  protected readonly concentrationLabels = CONCENTRATION_LABELS;
  protected readonly genderLabels = GENDER_LABELS;
  protected readonly sillageLabels = SILLAGE_LABELS;
  protected readonly maxRating = MAX_RATING;

  /** Only the slots that have actually resolved - a still-loading one just isn't rendered yet. */
  protected readonly products = computed(() =>
    this.compareService.products().filter((product): product is Product => product !== null),
  );

  protected readonly hasEnoughToCompare = computed(() => this.products().length >= 2);

  protected readonly gridTemplateColumns = computed(
    () => `200px repeat(${Math.max(this.products().length, 1)}, minmax(220px, 1fr))`,
  );

  protected remove(product: Product): void {
    this.compareService.remove(product.id, product.variantId);
  }

  /** Same fallback as `FragranceProfile`: splits the flat `notes` list positionally when there's no structured breakdown. */
  protected topNotes(product: Product): readonly string[] {
    const [flatTop] = product.notes;
    return product.fragranceNotes?.top ?? (flatTop ? [flatTop] : []);
  }

  protected heartNotes(product: Product): readonly string[] {
    const [, flatHeart] = product.notes;
    return product.fragranceNotes?.heart ?? (flatHeart ? [flatHeart] : []);
  }

  protected baseNotes(product: Product): readonly string[] {
    const [, , flatBase] = product.notes;
    return product.fragranceNotes?.base ?? (flatBase ? [flatBase] : []);
  }

  protected seasonBars(product: Product): readonly UsageBar[] {
    const season = product.seasonUsage;
    if (!season) return [];
    return [
      { label: 'Primavera', value: season.primavera },
      { label: 'Verano', value: season.verano },
      { label: 'Otoño', value: season.otono },
      { label: 'Invierno', value: season.invierno },
    ];
  }

  protected dayBars(product: Product): readonly UsageBar[] {
    const day = product.dayUsage;
    if (!day) return [];
    return [
      { label: 'Día', value: day.dia },
      { label: 'Noche', value: day.noche },
    ];
  }

  protected occasionBars(product: Product): readonly UsageBar[] {
    const occasions = product.occasions;
    if (!occasions) return [];
    return [
      { label: 'Trabajo', value: occasions.trabajo },
      { label: 'Romántico', value: occasions.romantico },
      { label: 'Social', value: occasions.social },
      { label: 'Casual', value: occasions.casual },
      { label: 'Formal', value: occasions.formal },
      { label: 'Deporte', value: occasions.deporte },
    ];
  }

  protected starFills(product: Product): readonly number[] {
    const rating = product.rating ?? 0;
    return [1, 2, 3, 4, 5].map((step) => Math.min(100, Math.max(0, (rating - (step - 1)) * 100)));
  }
}
