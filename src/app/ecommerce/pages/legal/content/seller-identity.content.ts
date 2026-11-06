import type { LegalInfo } from '../../../data/legal-info.service';
import type { LegalContent } from '../legal-page/legal-page';

/**
 * Ficha de identificación del vendedor (Ley 24.240 arts. 4/32 y normativa de ARCA sobre
 * identificación fiscal en e-commerce). Se muestra también, resumida, en el footer - esta
 * página tiene el detalle completo para que no quede oculta solo dentro de los términos.
 */
export function buildSellerIdentityContent(legal: LegalInfo): LegalContent {
  return {
    title: 'Identificación del vendedor',
    lastUpdated: '6 de noviembre de 2026',
    sections: [
      {
        heading: 'Datos comerciales y fiscales',
        list: [
          `Nombre comercial: ${legal.businessName}`,
          `Razón social / titular: ${legal.legalName}`,
          `CUIT: ${legal.cuit}`,
          `Domicilio comercial: ${legal.address}`,
          `Localidad: ${legal.locality}`,
          `Provincia: ${legal.province}`,
        ],
      },
      {
        heading: 'Atención al cliente',
        list: [
          `Email: ${legal.supportEmail}`,
          `WhatsApp: ${legal.whatsapp}`,
          `Horario de atención: ${legal.businessHours}`,
        ],
      },
      {
        heading: 'Constancia de inscripción fiscal',
        paragraphs: [
          'La constancia de inscripción ante ARCA (ex AFIP) se exhibe acá apenas el titular la' +
            ' proporcione. Mientras tanto, los datos de arriba marcados como pendientes deben' +
            ' completarse antes de considerar esta ficha definitiva.',
        ],
      },
    ],
  };
}
