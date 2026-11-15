/**
 * Inserta transformaciones de Cloudinary (`f_auto,q_auto` + ancho opcional) en una URL ya subida -
 * nunca sube ni modifica el asset original, solo cambia qué variante se pide al servirla (son
 * transformaciones "on the fly" gratuitas de la cuenta, no requieren plan pago). Confirmado en la
 * auditoría de performance (2026-11-11, `06-images-cloudinary.md`): hasta ahora se servía siempre
 * el archivo original completo, incluso en miniaturas de 22px.
 *
 * Si la URL no es de Cloudinary (o no tiene el segmento `/upload/` esperado), se devuelve sin
 * modificar - nunca rompe una imagen que no sabe transformar.
 */
export const cloudinaryUrl = (url: string, width?: number): string => {
  const marker = '/upload/';
  const markerIndex = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || markerIndex === -1) return url;

  const transform = width ? `f_auto,q_auto,w_${width}` : 'f_auto,q_auto';
  const insertAt = markerIndex + marker.length;
  return `${url.slice(0, insertAt)}${transform}/${url.slice(insertAt)}`;
};

/**
 * La imagen grande de la ficha del producto. Una sola definición para la galería y para la
 * precarga desde la card del catálogo: si las dos URLs no fueran idénticas, la precarga no
 * serviría de nada (el navegador las trataría como imágenes distintas).
 */
export const productMainImageUrl = (url: string): string => cloudinaryUrl(url, 800);

const preloadedUrls = new Set<string>();

/**
 * Descarga una imagen en segundo plano para que, cuando se muestre, ya esté en la caché del
 * navegador. Una sola vez por URL. Además "calienta" la versión en Cloudinary: la primera vez que
 * se pide una variante (ej. `w_800`), Cloudinary la genera en el momento (~0,6-1 s medidos).
 */
export function preloadImage(url: string): void {
  if (typeof Image === 'undefined' || preloadedUrls.has(url)) return;
  preloadedUrls.add(url);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
}
