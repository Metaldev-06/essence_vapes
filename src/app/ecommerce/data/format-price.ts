// Mirrors the backend's format-price.helper.ts - used here only for values the backend never
// formats itself, like a cart line's subtotal (unit price × quantity) or the cart's grand total.
const currencyFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

export const formatPrice = (value: number): string => `$${currencyFormatter.format(value)}`;
