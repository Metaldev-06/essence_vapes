import { inject } from '@angular/core';
import { Router, type ResolveFn } from '@angular/router';

import { decodeImage, productMainImageUrl } from '../../data/cloudinary-url.helper';
import type { MediaAsset, Product } from '../../data/product.model';
import { ProductsService } from '../../data/products.service';

/**
 * Cuánto puede esperar la navegación a la ficha para abrirla ya con el producto y su foto.
 * Si el servidor tarda más, la ficha se abre igual con el esqueleto de carga, como siempre.
 */
export const PRODUCT_PREVIEW_BUDGET_MS = 350;

/** La primera foto que va a mostrar la galería: la de la variante elegida, o la del producto. */
export function coverImageFor(product: Product, variantId: string | null): MediaAsset | undefined {
  const variant = variantId ? product.variants.find((candidate) => candidate.id === variantId) : undefined;
  const images = variant && variant.images.length > 0 ? variant.images : product.images;
  return images[0];
}

/**
 * Para que funcione la view transition card → ficha: Angular arranca la transición DESPUÉS de los
 * `resolve` de la ruta y solo espera UN render de la página nueva. Sin esto, la ficha se abría
 * con el esqueleto (pedía el producto recién después) y la imagen no tenía a qué "volar".
 *
 * Espera el producto (casi siempre ya precargado al pasar el mouse por la card) y que su foto esté
 * decodificada, todo dentro de `PRODUCT_PREVIEW_BUDGET_MS`. La ficha lo recibe como input
 * `preview` y lo muestra en ese primer render.
 */
export const productPreviewResolver: ResolveFn<Product | null> = async (route) => {
  // `inject` antes de cualquier `await`: después ya no hay contexto de inyección.
  const productsService = inject(ProductsService);
  const router = inject(Router);
  const id = route.paramMap.get('id');
  if (!id) return null;

  // Entrada directa a la URL o recarga: no hay transición (no hay página anterior), así que no
  // tiene sentido demorar la apertura. Solo se arranca el pedido para que la ficha lo reutilice.
  if (!router.navigated) {
    productsService.prefetchProduct(id);
    return null;
  }

  const deadline = Date.now() + PRODUCT_PREVIEW_BUDGET_MS;
  const product = await productsService.loadForNavigation(id, PRODUCT_PREVIEW_BUDGET_MS);
  if (!product) return null;

  const cover = coverImageFor(product, route.queryParamMap.get('variant'));
  if (cover) await decodeImage(productMainImageUrl(cover.url), deadline - Date.now());
  return product;
};
