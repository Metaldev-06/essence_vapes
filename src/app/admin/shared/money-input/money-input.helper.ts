import { formatPrice } from '../../../ecommerce/data/format-price';

/**
 * Tope de dígitos de un importe: un billón de pesos ya no es un precio real, y pasado este largo
 * un `number` de JavaScript empieza a perder precisión.
 */
export const MAX_MONEY_DIGITS = 12;

/** Lo que se muestra en el campo: "$100.000" (mismo formato que la tienda); vacío sin valor. */
export function formatMoneyInput(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? '' : formatPrice(value);
}

/**
 * Los dígitos de los pesos enteros de lo que haya escrito en el campo, sin ceros a la izquierda.
 * Acepta lo que se tipea ("100000"), lo ya formateado ("$100.000") y lo que se pega en formato
 * argentino con centavos ("$ 100.000,50"): la coma es el separador decimal, así que lo que viene
 * después se descarta - los precios del catálogo son enteros.
 */
export function extractMoneyDigits(raw: string): string {
  const integerPart = raw.replace(/,\d{0,2}\s*$/, '');
  return integerPart.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

export function moneyDigitsToValue(digits: string): number | null {
  return digits === '' ? null : Number(digits);
}

/** Cuántos dígitos hay en `text` antes de la posición `caret`. */
export function countDigitsBefore(text: string, caret: number): number {
  return text.slice(0, caret).replace(/\D/g, '').length;
}

/**
 * Posición del cursor en `formatted` justo después de su dígito número `digitCount`: así el
 * cursor no salta al final cuando el formato agrega o quita un punto.
 */
export function caretAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) {
    const firstDigit = formatted.search(/\d/);
    return firstDigit === -1 ? formatted.length : firstDigit;
  }
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    if (/\d/.test(formatted[index]) && ++seen === digitCount) return index + 1;
  }
  return formatted.length;
}
