import { NgOptimizedImage } from '@angular/common';
import { Component, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../../../core/cart/cart.service';
import { CompareService } from '../../../core/compare/compare.service';
import { FavoritesService } from '../../../core/favorites/favorites.service';
import { cloudinaryUrl, preloadImage, productMainImageUrl } from '../../data/cloudinary-url.helper';
import { CATEGORY_SINGULAR_LABELS, type Gender, type Product } from '../../data/product.model';
import {
  PRODUCT_IMAGE_TRANSITION_NAME,
  ProductViewTransition,
} from '../../data/product-view-transition';
import { isModifiedClick } from '../../data/products-filters-store';
import { ProductsService } from '../../data/products.service';

const GENDER_LABELS: Record<Gender, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  unisex: 'Unisex',
};

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  private readonly favoritesService = inject(FavoritesService);
  private readonly cartService = inject(CartService);
  private readonly compareService = inject(CompareService);
  private readonly productsService = inject(ProductsService);
  private readonly viewTransition = inject(ProductViewTransition);

  readonly product = input.required<Product>();
  /** `'list'` lays the card out as a horizontal row (used by `/favoritos`' list view toggle). */
  readonly layout = input<'grid' | 'list'>('grid');
  protected readonly maxCompareItems = this.compareService.maxItems;

  protected readonly categoryLabel = computed(() => CATEGORY_SINGULAR_LABELS[this.product().category]);

  protected readonly genderLabel = computed(() => {
    const gender = this.product().gender;
    return gender ? GENDER_LABELS[gender] : undefined;
  });

  /** First uploaded photo, if any - falls back to the decorative SVG bottle otherwise. */
  protected readonly coverImage = computed(() => this.product().images[0]);

  /** `f_auto,q_auto,w_480` - see `cloudinaryUrl`'s docblock. 480 comfortably covers this card's
   *  photo frame at retina density without serving the full-resolution original. */
  protected readonly coverImageUrl = computed(() => {
    const cover = this.coverImage();
    return cover ? cloudinaryUrl(cover.url, 480) : undefined;
  });

  /** Solo la card que se tocó lleva el nombre de la transición (ver `ProductViewTransition`). */
  protected readonly viewTransitionName = computed(() =>
    this.viewTransition.nameFor(this.product().id, this.product().variantId),
  );

  private readonly cover = viewChild<ElementRef<HTMLImageElement>>('cover');

  protected readonly isFavorite = computed(() =>
    this.favoritesService.isFavorite(this.product().id, this.product().variantId),
  );

  protected readonly isComparing = computed(() =>
    this.compareService.isComparing(this.product().id, this.product().variantId),
  );

  /** Disabled only when trying to ADD a new item while already at the comparator's max. */
  protected readonly compareDisabled = computed(
    () => !this.isComparing() && this.compareService.isFull(),
  );

  /** Agotado de verdad (stock 0). Distinto de `canAddToCart`, que también se apaga cuando ya
   *  tenés en el carrito todas las unidades disponibles. */
  protected readonly isSoldOut = computed(() => this.product().stock <= 0);

  protected readonly canAddToCart = computed(() => {
    const product = this.product();
    return (
      product.isActive &&
      this.cartService.getQuantity(product.id, product.variantId) < product.stock
    );
  });

  protected readonly compareTooltip = computed(() => {
    if (this.compareDisabled()) return `Ya tenés ${this.maxCompareItems} productos para comparar`;
    return this.isComparing() ? 'Quitar de comparación' : 'Agregar a comparación';
  });

  protected readonly favoriteTooltip = computed(() =>
    this.isFavorite() ? 'Quitar de favoritos' : 'Agregar a favoritos',
  );

  protected readonly cartTooltip = computed(() =>
    this.canAddToCart() ? 'Agregar al carrito' : 'Sin stock disponible',
  );

  protected toggleFavorite(): void {
    void this.favoritesService.toggle(this.product().id, this.product().variantId);
  }

  protected toggleCompare(): void {
    this.compareService.toggle(this.product().id, this.product().variantId);
  }

  protected addToCart(): void {
    if (!this.canAddToCart()) return;
    void this.cartService.add(this.product(), 1);
  }

  /**
   * Click en la card: esta imagen es la que va a "volar" hasta la ficha. El nombre se pone
   * también directo en el elemento, porque el navegador saca la "foto" de la página actual apenas
   * arranca la navegación y no hay garantía de que Angular ya haya aplicado el binding. Con
   * Ctrl/Cmd (abrir en otra pestaña) no hay transición en esta pestaña.
   */
  protected startTransition(event: MouseEvent): void {
    if (isModifiedClick(event)) return;
    const product = this.product();
    this.viewTransition.start(product.id, product.variantId);
    const cover = this.cover()?.nativeElement;
    if (cover) cover.style.viewTransitionName = PRODUCT_IMAGE_TRANSITION_NAME;
  }

  /** Hover/focus on the card - warms its detail page's data before the click (see
   *  `ProductsService.prefetchProduct`). The card always links to `/productos/:id` by `id`, not
   *  `variantId`, so that's what gets prefetched too. */
  protected prefetchDetail(): void {
    this.productsService.prefetchProduct(this.product().id);
    // La foto grande de la ficha es la misma que la portada de esta card (las dos usan las
    // imágenes efectivas de la variante): se baja ya, así al hacer clic aparece al instante.
    const cover = this.coverImage();
    if (cover) preloadImage(productMainImageUrl(cover.url));
  }
}
