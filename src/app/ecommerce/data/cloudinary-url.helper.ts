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
