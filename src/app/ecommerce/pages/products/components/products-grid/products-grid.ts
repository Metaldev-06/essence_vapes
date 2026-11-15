import { Component, ElementRef, afterRenderEffect, computed, input, output, viewChild } from '@angular/core';
import { ProductCard } from '../../../../shared/product-card/product-card';
import { ProductCardSkeleton } from '../../../../shared/product-card-skeleton/product-card-skeleton';
import type { Product, ProductCategory } from '../../../../data/product.model';
import { catalogNounFor, emptyCatalogHintFor } from '../../../../data/catalog-filter-groups';

const INITIAL_SKELETON_COUNT = 12;
const TRAILING_SKELETON_COUNT = 4;

@Component({
  selector: 'app-products-grid',
  imports: [ProductCard, ProductCardSkeleton],
  templateUrl: './products-grid.html',
  styleUrl: './products-grid.css',
})
export class ProductsGrid {
  readonly products = input.required<readonly Product[]>();
  readonly isLoading = input(false);
  readonly hasMore = input(false);
  /** Categoría activa: define cómo se nombra lo que no se encontró ("fragancias" solo en
   *  perfumes/decants). */
  readonly category = input<ProductCategory | 'todos'>('todos');

  protected readonly emptyTitle = computed(
    () => `No encontramos ${catalogNounFor(this.category())} con esos filtros`,
  );
  protected readonly emptyHint = computed(() => emptyCatalogHintFor(this.category()));

  readonly loadMore = output<void>();

  protected readonly initialSkeletons = Array.from({ length: INITIAL_SKELETON_COUNT });
  protected readonly trailingSkeletons = Array.from({ length: TRAILING_SKELETON_COUNT });

  protected readonly showInitialSkeleton = computed(() => this.isLoading() && this.products().length === 0);
  protected readonly showTrailingSkeleton = computed(() => this.isLoading() && this.products().length > 0);

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
