import { Component, computed, input } from '@angular/core';
import type { Longevity, Product, Sillage } from '../../../../data/product.model';

const SILLAGE_STEPS: readonly Sillage[] = ['intimo', 'moderado', 'fuerte', 'enorme'];

const SILLAGE_LABELS: Record<Sillage, string> = {
  intimo: 'Íntimo',
  moderado: 'Moderado',
  fuerte: 'Fuerte',
  enorme: 'Enorme',
};

const LONGEVITY_STEPS: readonly Longevity[] = ['2-4h', '4-6h', '6-8h', '8-12h', '12h+'];

@Component({
  selector: 'app-product-performance',
  imports: [],
  templateUrl: './product-performance.html',
  styleUrl: './product-performance.css',
})
export class ProductPerformance {
  readonly product = input.required<Product>();

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
}
