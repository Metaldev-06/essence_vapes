import type { LegalInfo } from '../../../data/legal-info.service';
import type { LegalContent } from '../legal-page/legal-page';

/**
 * Política de privacidad, basada en la Ley 25.326 de Protección de Datos Personales y su
 * reglamentación (Agencia de Acceso a la Información Pública - AAIP). Describe únicamente lo
 * que el sitio realmente recolecta y hace hoy (cuentas, carrito, favoritos, arrepentimiento,
 * contacto) - no afirma un cumplimiento automático por el solo hecho de publicar esta página.
 */
export function buildPrivacyContent(legal: LegalInfo): LegalContent {
  return {
    title: 'Política de privacidad',
    lastUpdated: '6 de noviembre de 2026',
    intro:
      'Esta política explica qué datos personales recolectamos a través de' +
      ' essencevapes.com.ar, para qué los usamos y qué derechos tenés sobre ellos, conforme a' +
      ' la Ley 25.326 de Protección de Datos Personales.',
    sections: [
      {
        heading: '1. Responsable de los datos',
        paragraphs: [
          `${legal.legalName} (${legal.businessName}), CUIT ${legal.cuit}, con domicilio en` +
            ` ${legal.address}, ${legal.locality}, ${legal.province}, es responsable del` +
            ` tratamiento de los datos recolectados en este sitio. Contacto:` +
            ` ${legal.supportEmail}.`,
        ],
      },
      {
        heading: '2. Datos personales que recopilamos',
        list: [
          'Cuenta: nombre completo y email, al registrarte o iniciar sesión.',
          'Compra/entrega: nombre, email, teléfono y domicilio de entrega, cuando los' +
            ' proporcionás para coordinar un pedido.',
          'Arrepentimiento/contacto: nombre, email, teléfono y la información que incluyas al' +
            ' completar el botón de arrepentimiento o el formulario de contacto.',
          'Técnicos: el token de sesión (guardado en tu navegador) que te mantiene' +
            ' identificado mientras usás el sitio, y el contenido de tu carrito.',
        ],
      },
      {
        heading: '3. Finalidades del tratamiento',
        list: [
          'Gestionar tu cuenta, tu carrito y tus favoritos.',
          'Procesar y dar seguimiento a tus pedidos, consultas y solicitudes de' +
            ' arrepentimiento, cambio o devolución.',
          'Responder tus consultas por los canales de contacto.',
          'Cumplir obligaciones legales (p. ej. conservar registros de reclamos de' +
            ' consumidor).',
        ],
      },
      {
        heading: '4. Base o justificación de cada tratamiento',
        list: [
          'Ejecución de la relación comercial: datos de cuenta, compra y entrega.',
          'Tu consentimiento al completar un formulario: contacto y arrepentimiento.',
          'Cumplimiento de obligaciones legales: conservación de reclamos y trámites de' +
            ' consumidor.',
        ],
      },
      {
        heading: '5. Datos necesarios para compras y entregas',
        paragraphs: [
          'Para coordinar la entrega de un pedido necesitamos como mínimo tu nombre, un medio' +
            ' de contacto (email o teléfono) y el domicilio de entrega. No pedimos tu DNI ni' +
            ' tu CUIT salvo que sea estrictamente necesario para emitir un comprobante fiscal' +
            ' (ver la sección de facturación en "Términos y condiciones").',
        ],
      },
      {
        heading: '6. Uso de cuentas de usuario',
        paragraphs: [
          'Tu cuenta guarda tu nombre, email y contraseña (encriptada, nunca en texto plano),' +
            ' además de tus favoritos y, si estás logueado, tu carrito. Podés pedir la' +
            ' eliminación de tu cuenta en cualquier momento por los canales de contacto.',
        ],
      },
      {
        heading: '7. Servicios de pago',
        paragraphs: [
          'El sitio todavía no integra una pasarela de pago online. Cuando se incorpore una,' +
            ' esta sección se actualizará con el nombre del proveedor y qué datos le' +
            ' transmitimos - nunca guardamos números completos de tarjeta en nuestros' +
            ' servidores.',
        ],
      },
      {
        heading: '8. Proveedores logísticos',
        paragraphs: [
          'Cuando coordinamos un envío, compartimos con el transportista elegido los datos' +
            ' estrictamente necesarios para la entrega (nombre, domicilio, teléfono). Todavía' +
            ' no hay un transportista integrado automáticamente al sitio - la coordinación es' +
            ' manual, por los canales de contacto.',
        ],
      },
      {
        heading: '9. Proveedores tecnológicos',
        paragraphs: [
          'Usamos Cloudinary para almacenar y servir las imágenes/videos de los productos (no' +
            ' recibe datos personales tuyos). No usamos ningún proveedor de analítica o' +
            ' publicidad - ver la "Política de cookies" para el detalle completo.',
        ],
      },
      {
        heading: '10. Plazos y criterios de conservación',
        paragraphs: [
          'Conservamos los datos de tu cuenta mientras la mantengas activa. Los datos de' +
            ' solicitudes de arrepentimiento/contacto se conservan el tiempo necesario para' +
            ' resolver el trámite y cumplir los plazos legales de conservación de reclamos de' +
            ' consumidor.',
        ],
      },
      {
        heading: '11. Seguridad de la información',
        paragraphs: [
          'Tu contraseña se guarda encriptada (hash), nunca en texto plano. El acceso al' +
            ' panel administrativo requiere autenticación separada de la de clientes. Seguimos' +
            ' mejorando las medidas de seguridad de forma continua - ver COMPLIANCE_ARGENTINA.md' +
            ' para el detalle de lo auditado y lo pendiente.',
        ],
      },
      {
        heading: '12. Derechos de acceso, rectificación, actualización y supresión',
        paragraphs: [
          'Como titular de tus datos, podés pedirnos en cualquier momento acceder a ellos,' +
            ' corregirlos, actualizarlos o solicitar su eliminación, conforme a la Ley 25.326.' +
            ' La Agencia de Acceso a la Información Pública es la autoridad de control en' +
            ' materia de protección de datos personales en Argentina.',
        ],
      },
      {
        heading: '13. Canal para ejercer tus derechos',
        paragraphs: [
          `Escribinos a ${legal.supportEmail} indicando qué derecho querés ejercer. Vamos a` +
            ' responderte en un plazo razonable.',
        ],
      },
      {
        heading: '14. Transferencias internacionales',
        paragraphs: [
          'Cloudinary (almacenamiento de imágenes/video) puede procesar datos en servidores' +
            ' fuera de la Argentina; no le transmitimos datos personales de clientes, solo' +
            ' archivos de producto. Si en el futuro incorporamos un proveedor que sí procese' +
            ' datos personales fuera del país, esta sección se actualizará con el detalle.',
        ],
      },
    ],
    disclaimer:
      'Publicar esta política no implica, por sí solo, el cumplimiento automático de toda la' +
      ' normativa de protección de datos - es una descripción honesta de las prácticas' +
      ' actuales del sitio, pendiente de revisión profesional. Ver COMPLIANCE_ARGENTINA.md.',
  };
}
