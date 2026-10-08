import type { Product } from '../../ecommerce/data/product.model';

/** A line in the cart. `availableStock`/`isValid` are only as fresh as the last revalidation. */
export interface CartLine {
  readonly productId: string;
  readonly product: Product;
  readonly quantity: number;
  readonly availableStock: number;
  readonly isValid: boolean;
}

export interface CartMutationResult {
  readonly success: boolean;
  readonly message?: string;
}

/** Shape returned by the backend for a single cart line (GET /cart, PUT /cart/items/:id). */
export interface BackendCartItem {
  readonly productId: string;
  readonly product: Product | null;
  readonly quantity: number;
  readonly availableStock: number;
  readonly isValid: boolean;
}

export interface BackendCartValidation {
  readonly items: BackendCartItem[];
  readonly removed: BackendCartItem[];
}

/** Response shape of the public, batched GET /products/stock endpoint. */
export interface ProductStockInfo {
  readonly id: string;
  readonly stock: number;
  readonly isActive: boolean;
}
