/** Producción - usado por `ng build` (configuración "production" es la default del build target). */
export const environment = {
  production: true,
  apiBaseUrl: 'https://essence-vapes.metaldev.cloud/api/v1',
  // Completar con la Public Key REAL (de producción) antes del próximo deploy - sin esto, el
  // paso de pago del checkout no puede inicializar el Payment Brick.
  mercadoPagoPublicKey: 'APP_USR-2f568224-671f-4181-87e5-6fbb3b362b14',
};
