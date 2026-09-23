import { Component, ElementRef, afterRenderEffect, input, output, viewChild } from '@angular/core';
import { ProductCard } from '../../../../shared/product-card/product-card';
import type { Product } from '../../../../data/product.model';

@Component({
  selector: 'app-products-grid',
  imports: [ProductCard],
  templateUrl: './products-grid.html',
  styleUrl: './products-grid.css',
})
export class ProductsGrid {
  readonly products = input.required<readonly Product[]>();
  readonly isLoading = input(false);
  readonly hasMore = input(false);

  readonly loadMore = output<void>();

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  constructor() {
    afterRenderEffect((onCleanup) => {
      this.products();

      const element = this.sentinel()?.nativeElement;
      if (!element) {
        return;
      }

      const observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) {
          this.loadMore.emit();
        }
      });
      observer.observe(element);
      onCleanup(() => observer.disconnect());
    });
  }
}
