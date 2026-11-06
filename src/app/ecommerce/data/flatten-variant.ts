import { BASE_VARIANT_ID, type Product } from './product.model';

/**
 * Same product, but with every variant-dependent field (price/stock/images/label/featured)
 * overridden to reflect one specific variant - mirrors the backend's `flattenProductVariant`.
 * Falls back to the product as-is if `variantId` doesn't match any of its variants.
 */
export function flattenToVariant(product: Product, variantId: string): Product {
  const variant = product.variants.find((candidate) => candidate.id === variantId);
  if (!variant) return product;

  return {
    ...product,
    variantId: variant.id,
    variantLabel: variant.label,
    priceValue: variant.priceValue,
    price: variant.price,
    stock: variant.stock,
    images: variant.images.length > 0 ? variant.images : product.images,
    featured: variant.featured,
    oldPrice: variant.id === BASE_VARIANT_ID ? product.oldPrice : undefined,
    oldPriceValue: variant.id === BASE_VARIANT_ID ? product.oldPriceValue : undefined,
  };
}
