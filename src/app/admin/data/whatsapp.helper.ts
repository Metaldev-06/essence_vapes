import type { Order } from '../../core/orders/order.model';
import { buildWhatsAppLink } from '../../core/whatsapp/whatsapp-link.helper';

const STORE_NAME = 'Essence Vapes';

const firstName = (fullName: string): string => fullName.trim().split(/\s+/)[0] || fullName;

const itemsSummary = (order: Order): string =>
  order.items
    .map((item) => `- ${item.quantity}x ${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}`)
    .join('\n');

/** Mismo criterio que la tarjeta "Entrega" del detalle de orden - la dirección se arma línea por
 *  línea en vez de un solo bloque, para que quede legible dentro del mensaje de WhatsApp. */
const addressSummary = (order: Order): string => {
  const address = order.shippingAddress;
  if (!address) return '';
  const lines = [`${address.street} ${address.streetNumber}${address.apartment ? `, ${address.apartment}` : ''}`];
  if (address.betweenStreets) lines.push(`Entre calles: ${address.betweenStreets}`);
  lines.push(`${address.city}, ${address.province} (${address.postalCode})`);
  if (address.notes) lines.push(address.notes);
  return lines.join('\n');
};

/** Mismo criterio que el desglose de totales del detalle de orden: el envío nunca se cobra por
 *  Mercado Pago, se coordina (y cobra, si corresponde) directo por acá. */
const shippingCostLine = (order: Order): string =>
  order.shippingCostPending ? 'El costo de envío lo coordinamos por acá.' : `Costo de envío: ${order.shippingCost}`;

/**
 * Mensaje detallado para coordinar el envío (ver pedido del usuario, 2026-11-13) - saludo
 * personalizado + el pedido completo + la dirección + el total, para que el cliente tenga todo
 * lo que necesita confirmar en un solo mensaje, sin que el admin tenga que retipear nada.
 */
const buildShippingCoordinationMessage = (order: Order, name: string, shortId: string): string =>
  [
    `Hola ${name}! Te escribimos de ${STORE_NAME} para coordinar el envío de tu pedido #${shortId}.`,
    '',
    'Tu pedido:',
    itemsSummary(order),
    '',
    'Dirección de entrega:',
    addressSummary(order),
    '',
    `Subtotal: ${order.subtotal}`,
    shippingCostLine(order),
    `Total pagado: ${order.total}`,
    '',
    '¿Nos confirmás que la dirección está correcta así coordinamos el día y horario de entrega?',
  ].join('\n');

export interface WhatsAppAction {
  readonly label: string;
  readonly href: string;
}

/**
 * Enlaces de WhatsApp con mensaje precargado para coordinar la entrega/retiro de un pedido (ver
 * tarea, punto 8) - abren `wa.me` con el texto ya escrito; el admin siempre revisa y confirma
 * manualmente antes de enviar, esto nunca despacha un mensaje por su cuenta. Vacío si la orden
 * no tiene un teléfono de contacto registrado (no debería pasar, pero nunca se arma un link con
 * un número vacío).
 */
export const buildWhatsAppActions = (order: Order): readonly WhatsAppAction[] => {
  const phone = order.buyerPhone;
  if (!phone) return [];

  const name = firstName(order.buyerName);
  const shortId = order.id.slice(0, 8);

  if (order.deliveryMethod === 'pickup') {
    return [
      {
        label: 'Coordinar retiro',
        href: buildWhatsAppLink(
          phone,
          `Hola ${name}! Te escribimos de ${STORE_NAME} para coordinar el retiro de tu pedido #${shortId}. ¿Cuándo te queda cómodo pasar?`,
        ),
      },
      {
        label: 'Avisar que está listo para retirar',
        href: buildWhatsAppLink(
          phone,
          `Hola ${name}! Tu pedido #${shortId} de ${STORE_NAME} ya está listo para que lo retires.`,
        ),
      },
      {
        label: 'Confirmar retiro',
        href: buildWhatsAppLink(
          phone,
          `Hola ${name}! Confirmamos que retiraste tu pedido #${shortId} de ${STORE_NAME}. ¡Gracias por tu compra!`,
        ),
      },
    ];
  }

  return [
    {
      label: 'Coordinar envío',
      href: buildWhatsAppLink(phone, buildShippingCoordinationMessage(order, name, shortId)),
    },
    {
      label: 'Confirmar dirección',
      href: buildWhatsAppLink(
        phone,
        `Hola ${name}! Queremos confirmar la dirección de entrega de tu pedido #${shortId} antes de despacharlo. ¿Seguís en la misma dirección?`,
      ),
    },
    {
      label: 'Avisar que está en camino',
      href: buildWhatsAppLink(
        phone,
        `Hola ${name}! Tu pedido #${shortId} de ${STORE_NAME} ya está en camino.`,
      ),
    },
    {
      label: 'Avisar que fue entregado',
      href: buildWhatsAppLink(
        phone,
        `Hola ${name}! Confirmamos la entrega de tu pedido #${shortId} de ${STORE_NAME}. ¡Gracias por tu compra!`,
      ),
    },
  ];
};
