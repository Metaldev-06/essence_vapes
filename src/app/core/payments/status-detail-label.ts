/**
 * Traduce el `statusDetail` que devuelve el backend (= el `status_detail` crudo de Mercado Pago)
 * para un pago con tarjeta rechazado a un mensaje en español accionable para el comprador - antes
 * de esto se mostraba el código crudo de MP tal cual (ej. "cc_rejected_bad_filled_security_code").
 *
 * Mismo mapeo que el backend (`features/payments/helpers/status-detail-label.helper.ts`) - no hay
 * paquete compartido entre frontend y backend en este proyecto, así que se mantiene una copia en
 * cada lado (mismo criterio que otros labels espejados, ej. los de estado de orden).
 */
const STATUS_DETAIL_LABELS: Record<string, string> = {
  cc_rejected_other_reason:
    'Rechazado por un error general del medio de pago. Probá con otra tarjeta.',
  cc_rejected_call_for_authorize:
    'Tu tarjeta necesita autorización de tu banco para esta compra. Comunicate con tu entidad bancaria o probá con otra tarjeta.',
  cc_rejected_insufficient_amount:
    'Fondos insuficientes en la tarjeta. Probá con otra tarjeta o medio de pago.',
  cc_rejected_bad_filled_security_code:
    'El código de seguridad (CVV) no es correcto. Revisalo y probá de nuevo.',
  cc_rejected_bad_filled_date:
    'La fecha de vencimiento de la tarjeta no es correcta. Revisala y probá de nuevo.',
  cc_rejected_bad_filled_other:
    'Algún dato de la tarjeta no es correcto. Revisá los datos ingresados y probá de nuevo.',
  cc_rejected_bad_filled_card_number:
    'El número de tarjeta no es correcto. Revisalo y probá de nuevo.',
  cc_rejected_blacklist: 'La tarjeta fue rechazada por el medio de pago. Probá con otra tarjeta.',
  cc_rejected_card_disabled:
    'La tarjeta está deshabilitada. Comunicate con tu banco o probá con otra tarjeta.',
  cc_rejected_duplicated_payment:
    'Ya existe un pago igual reciente. Si necesitás pagar de nuevo, esperá unos minutos o probá con otra tarjeta.',
  cc_rejected_high_risk: 'El pago fue rechazado por el medio de pago. Probá con otra tarjeta.',
  cc_rejected_max_attempts:
    'Alcanzaste el límite de intentos para esta compra. Probá con otra tarjeta.',
};

/** `null` si no hay `statusDetail` - un código no mapeado cae a un mensaje genérico (nunca se
 *  muestra el string crudo de MP). */
export const statusDetailLabel = (statusDetail?: string | null): string | null => {
  if (!statusDetail) return null;
  return (
    STATUS_DETAIL_LABELS[statusDetail] ??
    'No pudimos validar el pago con tu tarjeta. Probá con otra tarjeta o medio de pago.'
  );
};
