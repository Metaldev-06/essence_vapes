/** Producción - usado por `ng build` (configuración "production" es la default del build target). */
export const environment = {
  production: true,
  apiBaseUrl: 'https://essence-vapes.metaldev.cloud/api/v1',
  // Completar con la Public Key REAL (de producción) antes del próximo deploy - sin esto, el
  // paso de pago del checkout no puede inicializar el Payment Brick.
  mercadoPagoPublicKey: 'APP_USR-c7655c6d-9a95-41d1-9406-589f197f6eb9',
};
