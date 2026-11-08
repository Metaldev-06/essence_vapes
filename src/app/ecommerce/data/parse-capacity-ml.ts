const ML_LABEL_PATTERN = /^(\d+(?:[.,]\d+)?)\s*ml$/i;

/**
 * Pulls the ml number out of a variant label like "5ml" or "125 ML" - mirrors the backend's
 * `parseCapacityMl` (`capacity.helper.ts`), used here to make the "Contenido neto"/"Volumen"
 * regulatory fields track the currently selected size variant instead of always showing the
 * single static value the admin typed into the product. Variant labels are free text, so
 * anything that doesn't match this shape (vape puff counts, etc.) just isn't parseable.
 */
export const parseCapacityMl = (label: string | null | undefined): number | null => {
  if (!label) return null;
  const match = ML_LABEL_PATTERN.exec(label.trim());
  if (!match) return null;
  return Number(match[1].replace(',', '.'));
};
