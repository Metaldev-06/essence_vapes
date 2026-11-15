import { Injectable, signal } from '@angular/core';

/**
 * `view-transition-name` de la imagen que "vuela" de la card a la ficha del producto.
 *
 * Es UNO SOLO y lo lleva solo la imagen que está transicionando: un `view-transition-name` tiene
 * que ser único en la página, y si se repite el navegador cancela la transición entera. Con un
 * nombre fijo por producto (`'product-' + id`) se repetía: las variantes de un mismo perfume
 * (ej. Le Male Elixir 125ml y 200ml) son cards distintas con el mismo id.
 */
export const PRODUCT_IMAGE_TRANSITION_NAME = 'product-image';

/** Identifica una card / una ficha: producto + variante. */
export function productTransitionKey(id: string, variantId: string | null | undefined): string {
  return `${id}::${variantId || 'base'}`;
}

/**
 * Qué producto está transicionando ahora. La card que se toca lo marca (`start`), esa card y la
 * galería de la ficha de ESE producto toman el nombre, y al terminar la animación se limpia
 * (`clear`, desde `withViewTransitions` en app.config.ts) para que la próxima navegación no
 * encuentre dos elementos con el mismo nombre.
 */
@Injectable({ providedIn: 'root' })
export class ProductViewTransition {
  private readonly activeKeySignal = signal<string | null>(null);
  readonly activeKey = this.activeKeySignal.asReadonly();

  start(id: string, variantId: string | null | undefined): void {
    this.activeKeySignal.set(productTransitionKey(id, variantId));
  }

  clear(): void {
    this.activeKeySignal.set(null);
  }

  /** El nombre para este producto/variante, o `null` si no es el que está transicionando. */
  nameFor(id: string, variantId: string | null | undefined): string | null {
    return this.activeKeySignal() === productTransitionKey(id, variantId) ? PRODUCT_IMAGE_TRANSITION_NAME : null;
  }
}
