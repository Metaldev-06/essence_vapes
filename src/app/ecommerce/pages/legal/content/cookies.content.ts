import type { LegalContent } from '../legal-page/legal-page';

/**
 * Política de cookies - contenido verificado contra el código real del sitio (grep de
 * localStorage/sessionStorage y de scripts de analítica/publicidad en toda la app frontend):
 * hoy NO hay ninguna cookie ni almacenamiento no esencial. No se inventan proveedores ni
 * categorías que no se usan. Si se agrega analítica o publicidad en el futuro, esta página y
 * el aviso de cookies deben actualizarse ANTES de activar esos scripts, no después.
 */
export function buildCookiesContent(): LegalContent {
  return {
    title: 'Política de cookies',
    lastUpdated: '6 de noviembre de 2026',
    intro:
      'Esta página explica, con precisión, qué guarda essencevapes.com.ar en tu navegador y' +
      ' qué no.',
    sections: [
      {
        heading: '1. Qué usamos hoy',
        paragraphs: [
          'Hoy el sitio NO utiliza cookies de analítica, publicidad ni de preferencias de' +
            ' terceros. Solo usa almacenamiento técnico necesario para que la tienda funcione:',
        ],
        list: [
          'Técnicas o necesarias: un token de sesión en localStorage (para mantenerte' +
            ' identificado si tenés una cuenta) y el contenido de tu carrito en' +
            ' sessionStorage (para que no se pierda si cambiás de página). Ninguno de los dos' +
            ' es una cookie en sentido estricto - son almacenamiento local del navegador con' +
            ' la misma finalidad.',
          'Analíticas: no usamos ninguna (ni Google Analytics, ni similares).',
          'Publicitarias o de marketing: no usamos ninguna (ni píxeles, ni redes publicitarias).',
          'Preferencias y personalización: no usamos ninguna.',
        ],
      },
      {
        heading: '2. Por qué no hay un gestor de consentimiento con categorías',
        paragraphs: [
          'Un gestor de consentimiento por categorías tiene sentido cuando existen cookies no' +
            ' esenciales para activar u optar. Como hoy no usamos ninguna, mostrarte un' +
            ' selector de categorías vacías sería engañoso. En su lugar, mostramos un aviso' +
            ' simple que te informa esto y que podés cerrar.',
        ],
      },
      {
        heading: '3. Qué pasa si esto cambia',
        paragraphs: [
          'Si en el futuro incorporamos analítica, publicidad o cualquier tecnología no' +
            ' esencial, vamos a actualizar esta página con el detalle real (qué proveedor,' +
            ' qué datos, por cuánto tiempo) y vamos a pedirte tu consentimiento explícito' +
            ' antes de activarla, no después.',
        ],
      },
      {
        heading: '4. Cómo controlar el almacenamiento técnico',
        paragraphs: [
          'Podés borrar el token de sesión y el carrito en cualquier momento desde la' +
            ' configuración de tu navegador (borrar datos del sitio) o cerrando sesión desde' +
            ' el menú de tu cuenta.',
        ],
      },
    ],
  };
}
