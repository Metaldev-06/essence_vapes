import { Component, computed, inject } from '@angular/core';

import { LegalInfoService } from '../../data/legal-info.service';
import { buildTermsContent } from './content/terms.content';
import { LegalPage } from './legal-page/legal-page';

@Component({
  selector: 'app-legal-terms',
  imports: [LegalPage],
  template: `<app-legal-page [content]="content()" />`,
})
export default class LegalTerms {
  private readonly legalInfoService = inject(LegalInfoService);
  protected readonly content = computed(() => buildTermsContent(this.legalInfoService.info()));
}
