import type { Order } from '../../core/orders/order.model';
import { buildWhatsAppLink } from '../../core/whatsapp/whatsapp-link.helper';

const STORE_NAME = 'Essence Vapes';

const firstName = (fullName: string): string => fullName.trim().split(/\s+/)[0] || fullName;

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
      href: buildWhatsAppLink(
        phone,
        `Hola ${name}! Te escribimos de ${STORE_NAME} para coordinar el envío de tu pedido #${shortId}.`,
      ),
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
