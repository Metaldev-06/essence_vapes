import type { LegalInfo } from '../../../data/legal-info.service';
import type { LegalContent } from '../legal-page/legal-page';

/**
 * Términos y condiciones. Fuentes: Ley 24.240 de Defensa del Consumidor (y su reglamentación),
 * Código Civil y Comercial arts. 1110-1116 (contratos a distancia / derecho de arrepentimiento),
 * Disposición 954/2025 (botón de arrepentimiento, reemplaza a la derogada Resolución 424/2020).
 * Redactado para reflejar el estado real de la tienda - no incluye promesas sobre
 * funcionalidades (pago online, facturación) que todavía no existen.
 */
export function buildTermsContent(legal: LegalInfo): LegalContent {
  return {
    title: 'Términos y condiciones',
    lastUpdated: '6 de noviembre de 2026',
    intro:
      'Estos términos regulan la compra de productos a través de essencevapes.com.ar. Al' +
      ' usar este sitio o realizar una compra, aceptás las condiciones descriptas acá.',
    sections: [
      {
        heading: '1. Identificación del vendedor',
        paragraphs: [
          `${legal.businessName} (${legal.legalName}, CUIT ${legal.cuit}) opera este sitio` +
            ` desde ${legal.address}, ${legal.locality}, ${legal.province}, Argentina.`,
          `Contacto: ${legal.supportEmail} / WhatsApp ${legal.whatsapp}.` +
            ` Horario de atención: ${legal.businessHours}.`,
          'Ver el detalle completo en la página "Identificación del vendedor".',
        ],
      },
      {
        heading: '2. Ámbito territorial de comercialización',
        paragraphs: [
          'La venta a través de este sitio está dirigida a consumidores ubicados en la' +
            ' República Argentina. No garantizamos que los productos ofrecidos cumplan la' +
            ' normativa de otros países.',
        ],
      },
      {
        heading: '3. Condiciones para comprar',
        paragraphs: [
          'Podés comprar como invitado o creando una cuenta. Debés tener capacidad legal para' +
            ' contratar y, para productos cuya venta esté restringida a mayores de edad (ver la' +
            ' sección de productos vapes), acreditar ser mayor de 18 años mediante el proceso' +
            ' de verificación de edad del sitio.',
        ],
      },
      {
        heading: '4. Proceso de compra',
        paragraphs: [
          'Elegís los productos, los agregás al carrito y revisás el resumen antes de' +
            ' confirmar. El sitio todavía no procesa pagos online de forma automática: al' +
            ' finalizar el carrito te indicamos cómo coordinar el pago y la entrega por los' +
            ' canales de contacto oficiales. Esta sección se actualizará cuando el pago' +
            ' online esté disponible.',
        ],
      },
      {
        heading: '5. Confirmación de pedidos',
        paragraphs: [
          'Un pedido se considera confirmado cuando recibís una respuesta nuestra (por email o' +
            ' WhatsApp) validando productos, precio y forma de entrega acordada. Mientras no' +
            ' recibas esa confirmación, el pedido no está garantizado.',
        ],
      },
      {
        heading: '6. Disponibilidad de productos',
        paragraphs: [
          'El stock mostrado en el sitio se actualiza en tiempo real contra nuestra base de' +
            ' datos, pero puede haber pequeños desajustes por ventas simultáneas. Si un' +
            ' producto deja de estar disponible después de confirmado tu pedido, te' +
            ' avisaremos y te ofreceremos un reemplazo, un reembolso o cancelar esa línea.',
        ],
      },
      {
        heading: '7. Precios y moneda',
        paragraphs: [
          'Todos los precios se muestran en pesos argentinos (ARS), incluyen los impuestos' +
            ' aplicables y no incluyen el costo de envío, que se informa por separado antes de' +
            ' confirmar el pedido. Nos reservamos el derecho de corregir errores de tipeo en' +
            ' los precios publicados, avisándote antes de confirmar cualquier compra afectada.',
        ],
      },
      {
        heading: '8. Métodos de pago',
        paragraphs: [
          'Hoy no procesamos pagos con tarjeta ni otros medios dentro de este sitio. Los' +
            ' medios de pago habilitados (transferencia, efectivo u otros) se coordinan' +
            ' directamente por los canales de contacto al confirmar el pedido. Si en el' +
            ' futuro se habilita el pago online, esta sección se actualizará con el detalle' +
            ' de cuotas, intereses y costo financiero total cuando corresponda.',
        ],
      },
      {
        heading: '9. Envíos y entregas',
        paragraphs: [
          'Ver el detalle completo en la página "Envíos y entregas", incluyendo zonas de' +
            ' cobertura, tiempos estimados y qué hacer ante un envío dañado o una entrega' +
            ' fallida.',
        ],
      },
      {
        heading: '10. Derecho de arrepentimiento',
        paragraphs: [
          'En las compras a distancia, el Código Civil y Comercial (arts. 1110-1116) y la Ley' +
            ' 24.240 te reconocen el derecho a arrepentirte de la compra dentro de los 10 días' +
            ' corridos desde que recibís el producto, sin costo y sin necesidad de justificar' +
            ' el motivo, salvo las excepciones legalmente previstas.',
          'Podés ejercerlo usando el "Botón de arrepentimiento" disponible en el sitio, sin' +
            ' necesidad de iniciar sesión ni registrarte. Te confirmamos la recepción de tu' +
            ' solicitud por el mismo medio, con un código de gestión, dentro de las 24 horas' +
            ' (ver Disposición 954/2025).',
        ],
      },
      {
        heading: '11. Cambios y devoluciones',
        paragraphs: [
          'Distinguimos el derecho de arrepentimiento (punto anterior) de un cambio comercial' +
            ' voluntario, un producto defectuoso, un error en la preparación del pedido o un' +
            ' daño en el transporte - cada caso tiene su propio tratamiento. Ver el detalle' +
            ' completo en la página "Cambios y devoluciones".',
        ],
      },
      {
        heading: '12. Garantías legales aplicables',
        paragraphs: [
          'Todo producto cuenta con la garantía legal por defectos o vicios prevista en la' +
            ' Ley 24.240, independientemente de cualquier garantía comercial adicional que se' +
            ' ofrezca puntualmente.',
        ],
      },
      {
        heading: '13. Productos dañados, defectuosos o incorrectos',
        paragraphs: [
          'Si recibís un producto dañado, defectuoso o distinto al que compraste, contactanos' +
            ' por los canales oficiales dentro de un plazo razonable desde la entrega. Vamos a' +
            ' resolverlo con reposición, reparación o reembolso, según corresponda, sin costo' +
            ' para vos.',
        ],
      },
      {
        heading: '14. Responsabilidad comercial',
        paragraphs: [
          'Respondemos por la exactitud de la información publicada sobre nuestros productos' +
            ' y por el cumplimiento de estos términos. No respondemos por demoras o fallas' +
            ' atribuibles exclusivamente a terceros (transportistas, proveedores de pago) fuera' +
            ' de nuestro control razonable, sin perjuicio de tu derecho a reclamarnos como' +
            ' vendedores frente al consumidor conforme a la Ley 24.240.',
        ],
      },
      {
        heading: '15. Canales de reclamo',
        paragraphs: [
          `Podés reclamar o consultar escribiendo a ${legal.supportEmail} o por WhatsApp al` +
            ` ${legal.whatsapp}. También podés recurrir a los organismos públicos de defensa` +
            ' del consumidor de tu jurisdicción.',
        ],
      },
      {
        heading: '16. Legislación aplicable',
        paragraphs: [
          'Estos términos se rigen por las leyes de la República Argentina, en particular la' +
            ' Ley 24.240 de Defensa del Consumidor y el Código Civil y Comercial de la Nación.',
        ],
      },
    ],
    disclaimer:
      'Este texto fue redactado como base de cumplimiento normativo y todavía está pendiente' +
      ' de revisión por un profesional matriculado en derecho del consumidor antes de' +
      ' considerarse definitivo. Ver COMPLIANCE_ARGENTINA.md en el repositorio para el detalle' +
      ' de qué está implementado, qué falta validar y qué datos del titular están pendientes.',
  };
}
