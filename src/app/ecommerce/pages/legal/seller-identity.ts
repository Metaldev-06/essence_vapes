import { Component, DestroyRef, computed, effect, inject } from '@angular/core';

import { SeoService } from '../../../core/seo/seo.service';
import { LegalInfoService } from '../../data/legal-info.service';
import { buildSellerIdentityContent } from './content/seller-identity.content';
import { LegalPage } from './legal-page/legal-page';

@Component({
  selector: 'app-legal-seller-identity',
  imports: [LegalPage],
  template: `<app-legal-page [content]="content()" />`,
})
export default class LegalSellerIdentity {
  private readonly legalInfoService = inject(LegalInfoService);
  private readonly seoService = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly content = computed(() =>
    buildSellerIdentityContent(this.legalInfoService.info()),
  );

  constructor() {
    // Organization con los datos reales del vendedor (incluye los placeholders tal cual si
    // todavía no se completaron) - reemplaza, solo en esta página, el bloque estático de
    // index.html mientras no esté definitivo.
    effect(() => {
      const legal = this.legalInfoService.info();
      this.seoService.setStructuredData({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: legal.businessName,
        legalName: legal.legalName,
        taxID: legal.cuit,
        email: legal.supportEmail,
        address: {
          '@type': 'PostalAddress',
          streetAddress: legal.address,
          addressLocality: legal.locality,
          addressRegion: legal.province,
          addressCountry: 'AR',
        },
      });
    });
    this.destroyRef.onDestroy(() => this.seoService.setStructuredData(null));
  }
}
