import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AccentKey, Product } from '../../data/product.model';

const ACCENT_VARS: Record<AccentKey, string> = {
  violet: 'var(--color-aurora-violet)',
  cyan: 'var(--color-aurora-cyan)',
  emerald: 'var(--color-aurora-emerald)',
  teal: 'var(--color-aurora-teal)',
};

@Component({
  selector: 'app-product-card',
  imports: [RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  readonly product = input.required<Product>();

  protected readonly accentVar = computed(() => ACCENT_VARS[this.product().accent]);
}
