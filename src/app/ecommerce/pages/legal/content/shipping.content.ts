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
          'Desde el checkout del sitio elegís entre envío a domicilio o retiro en nuestro' +
            ' local. No usamos Mercado Envíos ni ningún transportista integrado al sitio:' +
            ' coordinamos la entrega o el retiro directamente con vos por los canales de' +
            ' contacto.',
        ],
      },
      {
        heading: '3. Cálculo de costos',
        paragraphs: [
          'El costo de envío (si corresponde) se te muestra siempre antes de pagar. El' +
            ' retiro en el local nunca tiene costo de envío. Si todavía no definimos una' +
            ' tarifa para tu caso, tu pedido queda a la espera de que te confirmemos el costo' +
            ' antes de avanzar al pago - nunca se cobra un importe que no viste primero.',
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
          'Podés elegir "Retiro en el local" directamente en el checkout. Te confirmamos la' +
            ' dirección exacta y el horario de retiro al coordinar tu pedido por los canales' +
            ' de contacto.',
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
