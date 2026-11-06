import { Injectable } from '@angular/core';
import { httpResource } from '@angular/common/http';

import { API_BASE_URL } from '../../core/config/api.config';

export interface LegalInfo {
  readonly businessName: string;
  readonly legalName: string;
  readonly cuit: string;
  readonly address: string;
  readonly province: string;
  readonly locality: string;
  readonly supportEmail: string;
  readonly whatsapp: string;
  readonly businessHours: string;
  readonly vapesSaleEnforcementEnabled: boolean;
}

const DEFAULT_LEGAL_INFO: LegalInfo = {
  businessName: 'Essence Vapes',
  legalName: '',
  cuit: '',
  address: '',
  province: '',
  locality: '',
  supportEmail: '',
  whatsapp: '',
  businessHours: '',
  vapesSaleEnforcementEnabled: false,
};

/**
 * Fuente única de los datos legales/comerciales del vendedor (footer, páginas legales,
 * checkout). El backend es quien centraliza esto vía env vars (ver legal.config.ts) - cambiar
 * un dato es cambiar una env var y reiniciar el server, sin tocar ni redeployar el frontend.
 */
@Injectable({ providedIn: 'root' })
export class LegalInfoService {
  private readonly resource = httpResource<LegalInfo>(() => `${API_BASE_URL}/legal/info`, {
    defaultValue: DEFAULT_LEGAL_INFO,
  });

  readonly info = this.resource.value;
  readonly isLoading = this.resource.isLoading;
}
