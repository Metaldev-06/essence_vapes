import { Component, computed, input, signal } from '@angular/core';
import { ACCENT_VARS } from '../../../../data/accent';
import type { Product } from '../../../../data/product.model';

@Component({
  selector: 'app-product-gallery',
  imports: [],
  templateUrl: './product-gallery.html',
  styleUrl: './product-gallery.css',
})
export class ProductGallery {
  readonly product = input.required<Product>();

  protected readonly accentVar = computed(() => ACCENT_VARS[this.product().accent]);

  protected readonly isFavorite = signal(false);

  protected toggleFavorite(): void {
    this.isFavorite.update((value) => !value);
  }
}
