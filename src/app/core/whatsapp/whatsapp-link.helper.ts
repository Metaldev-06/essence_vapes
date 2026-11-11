const digitsOnly = (phone: string): string => phone.replace(/\D/g, '');

/**
 * Enlace `wa.me` con mensaje precargado - abre WhatsApp Web/app para que la persona (admin o
 * comprador, según quién lo use) revise y confirme el mensaje antes de enviarlo. Nunca envía
 * nada por su cuenta. Mismo criterio que `wa.me`: solo dígitos, sin "+".
 */
export const buildWhatsAppLink = (phone: string, message: string): string =>
  `https://wa.me/${digitsOnly(phone)}?text=${encodeURIComponent(message)}`;
