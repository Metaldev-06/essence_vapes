import { Component, computed, inject } from '@angular/core';

import { LegalInfoService } from '../../data/legal-info.service';
import { buildPrivacyContent } from './content/privacy.content';
import { LegalPage } from './legal-page/legal-page';

@Component({
  selector: 'app-legal-privacy',
  imports: [LegalPage],
  template: `<app-legal-page [content]="content()" />`,
})
export default class LegalPrivacy {
  private readonly legalInfoService = inject(LegalInfoService);
  protected readonly content = computed(() => buildPrivacyContent(this.legalInfoService.info()));
}
