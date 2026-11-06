import { Component, computed, inject } from '@angular/core';

import { LegalInfoService } from '../../data/legal-info.service';
import { buildShippingContent } from './content/shipping.content';
import { LegalPage } from './legal-page/legal-page';

@Component({
  selector: 'app-legal-shipping',
  imports: [LegalPage],
  template: `<app-legal-page [content]="content()" />`,
})
export default class LegalShipping {
  private readonly legalInfoService = inject(LegalInfoService);
  protected readonly content = computed(() => buildShippingContent(this.legalInfoService.info()));
}
