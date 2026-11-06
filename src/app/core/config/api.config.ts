import { environment } from '../../../environments/environment';

/**
 * `environment.ts` apunta al backend local; el build de producción (`ng build`, configuración
 * "production") lo reemplaza por `environment.prod.ts` vía `fileReplacements` en angular.json,
 * sin tocar código - ver esos dos archivos para los valores reales de cada entorno.
 */
export const API_BASE_URL = environment.apiBaseUrl;
