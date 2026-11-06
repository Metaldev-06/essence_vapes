import type { LegalInfo } from '../../../data/legal-info.service';
import type { LegalContent } from '../legal-page/legal-page';

/**
 * Cambios, devoluciones y reembolsos. A propósito distingue las 6 situaciones legalmente
 * distintas (arrepentimiento, cambio voluntario, defecto, error de preparación, daño en
 * transporte, garantía legal) y NO excluye automáticamente perfumes abiertos ni decants de
 * ninguna de ellas - cada caso se evalúa según corresponda, conforme a la Ley 24.240 y al
 * Código Civil y Comercial.
 */
export function buildReturnsContent(legal: LegalInfo): LegalContent {
  return {
    title: 'Cambios, devoluciones y reembolsos',
    lastUpdated: '6 de noviembre de 2026',
    intro:
      'No todas las devoluciones son iguales ante la ley. Acá explicamos las 6 situaciones' +
      ' distintas que pueden darse y cómo se resuelve cada una.',
    sections: [
      {
        heading: '1. Arrepentimiento de la compra a distancia',
        paragraphs: [
          'Tenés 10 días corridos desde que recibís el producto para arrepentirte de la' +
            ' compra sin dar motivo, usando el "Botón de arrepentimiento" del sitio - sin' +
            ' necesidad de cuenta ni trámites adicionales. Esto incluye perfumes y decants: no' +
            ' los excluimos automáticamente de este derecho por estar abiertos, sin perjuicio' +
            ' de que, por tratarse de productos de uso personal e higiene, evaluamos cada caso' +
            ' conforme a las excepciones legalmente previstas (por ejemplo, si el producto fue' +
            ' usado de un modo que excede la prueba razonable para decidir la compra).',
        ],
      },
      {
        heading: '2. Cambio comercial voluntario',
        paragraphs: [
          'Más allá de lo que exige la ley, si no estás conforme con tu compra por un motivo' +
            ' distinto al arrepentimiento (por ejemplo, no te gustó el aroma), contactanos' +
            ' dentro de los 10 días de recibido el producto - evaluamos cambios caso por caso' +
            ' según el estado del producto.',
        ],
      },
      {
        heading: '3. Producto defectuoso',
        paragraphs: [
          'Si el producto tiene un defecto de fabricación o no funciona como se describe,' +
            ' aplica la garantía legal (ver más abajo): te lo reponemos, reparamos o' +
            ' reembolsamos sin costo para vos.',
        ],
      },
      {
        heading: '4. Error en la preparación del pedido',
        paragraphs: [
          'Si te enviamos un producto distinto al que compraste o faltan unidades, es un' +
            ' error nuestro: lo corregimos sin costo para vos, incluyendo el envío del' +
            ' faltante o la logística de cambio.',
        ],
      },
      {
        heading: '5. Daño durante el transporte',
        paragraphs: [
          'Ver el detalle en "Envíos y entregas" - si el paquete llega dañado, te lo reponemos' +
            ' o reembolsamos sin costo para vos, siempre que nos avises dentro de las 48 horas' +
            ' de la entrega.',
        ],
      },
      {
        heading: '6. Garantía legal',
        paragraphs: [
          'Independientemente de cualquier plazo comercial, la Ley 24.240 te da una garantía' +
            ' legal por vicios o defectos que no se originen en el uso del producto. Esta' +
            ' garantía no se pierde por haber abierto o probado el producto de forma' +
            ' razonable.',
        ],
      },
      {
        heading: 'Cómo iniciar cualquiera de estos reclamos',
        paragraphs: [
          `Escribinos a ${legal.supportEmail} o por WhatsApp al ${legal.whatsapp} contándonos` +
            ' qué pasó, o usá el "Botón de arrepentimiento" si tu caso es específicamente ese.' +
            ' Te vamos a pedir una referencia de tu pedido si la tenés, pero no es' +
            ' excluyente para iniciar el trámite.',
        ],
      },
    ],
  };
}
