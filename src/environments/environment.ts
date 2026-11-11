/** Desarrollo local (`ng serve` / `bun run start`) - reemplazado por `environment.prod.ts` en el build de producción (ver `fileReplacements` en angular.json). */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api/v1',
  // Public Key de PRUEBA de Mercado Pago (segura para exponer en el bundle - nunca el Access
  // Token, que vive solo en el backend). Completar con la del backend local una vez creada la
  // app de Mercado Pago - ver `core/payments/mercadopago-sdk.service.ts`.
  mercadoPagoPublicKey: 'APP_USR-c7655c6d-9a95-41d1-9406-589f197f6eb9',
};
