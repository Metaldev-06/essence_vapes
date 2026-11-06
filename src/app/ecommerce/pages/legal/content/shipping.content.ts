import type { LegalInfo } from '../../../data/legal-info.service';
import type { LegalContent } from '../legal-page/legal-page';

/**
 * Política de envíos. Hoy la coordinación logística es manual (no hay un transportista
 * integrado al sitio) - este texto lo refleja en vez de prometer plazos/transportistas que no
 * podemos garantizar todavía.
 */
export function buildShippingContent(legal: LegalInfo): LegalContent {
  return {
    title: 'Envíos y entregas',
    lastUpdated: '6 de noviembre de 2026',
    sections: [
      {
        heading: '1. Cobertura geográfica',
        paragraphs: ['Realizamos envíos a todo el territorio de la República Argentina.'],
      },
      {
        heading: '2. Modalidades de entrega',
        paragraphs: [
          'Envío a domicilio a través de un transportista a coordinar, o retiro en punto a' +
            ' coordinar cuando esté disponible para tu zona. La modalidad y el transportista' +
            ' se confirman por los canales de contacto al momento de tu pedido - todavía no' +
            ' hay un cálculo ni una reserva automática dentro del sitio.',
        ],
      },
      {
        heading: '3. Cálculo de costos',
        paragraphs: [
          'El costo de envío depende de tu ubicación y del tamaño/peso del pedido, y se te' +
            ' informa antes de confirmar la compra - nunca se agrega como un cargo oculto' +
            ' después de confirmado el pedido.',
        ],
      },
      {
        heading: '4. Tiempos estimados',
        paragraphs: [
          'Los tiempos de entrega varían según tu ubicación y el transportista elegido. Te' +
            ' vamos a dar una estimación concreta al coordinar tu pedido - no prometemos un' +
            ' plazo fijo acá porque todavía depende de la coordinación manual con cada envío.',
        ],
      },
      {
        heading: '5. Seguimiento del pedido',
        paragraphs: [
          'Cuando el transportista elegido ofrezca seguimiento (tracking), te lo compartimos' +
            ' apenas esté disponible. Si no lo ofrece, te mantenemos informado por los canales' +
            ' de contacto.',
        ],
      },
      {
        heading: '6. Entregas fallidas',
        paragraphs: [
          'Si una entrega no pudo completarse (domicilio incorrecto, nadie para recibir,' +
            ' etc.), te contactamos para coordinar un nuevo intento. Los costos adicionales de' +
            ' un reintento por un error en los datos que nos proporcionaste pueden' +
            ' trasladarse; un error nuestro o del transportista no tiene costo para vos.',
        ],
      },
      {
        heading: '7. Retiro en sucursal',
        paragraphs: [
          'Todavía no tenemos un punto de retiro propio habilitado de forma general. Si en tu' +
            ' caso particular coordinamos un retiro, te lo confirmamos expresamente antes de' +
            ' tu compra.',
        ],
      },
      {
        heading: '8. Paquetes dañados',
        paragraphs: [
          'Si tu pedido llega dañado, conservá el empaque y las fotos del estado en que lo' +
            ` recibiste y contactanos a ${legal.supportEmail} o por WhatsApp al` +
            ` ${legal.whatsapp} dentro de las 48 horas de la entrega. Te lo reponemos o` +
            ' reembolsamos sin costo para vos.',
        ],
      },
      {
        heading: '9. Restricciones logísticas para perfumes',
        paragraphs: [
          'Los perfumes y decants contienen alcohol y son considerados mercancía' +
            ' potencialmente inflamable a efectos de transporte. Pueden aplicarse' +
            ' restricciones del transportista elegido (por ejemplo, exclusión de ciertos' +
            ' medios de transporte aéreo o límites de cantidad por envío); te avisamos si eso' +
            ' afecta a tu pedido puntual.',
        ],
      },
    ],
  };
}
