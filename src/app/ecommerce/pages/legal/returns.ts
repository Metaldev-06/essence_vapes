import { Component, computed, inject } from '@angular/core';

import { LegalInfoService } from '../../data/legal-info.service';
import { buildReturnsContent } from './content/returns.content';
import { LegalPage } from './legal-page/legal-page';

@Component({
  selector: 'app-legal-returns',
  imports: [LegalPage],
  template: `<app-legal-page [content]="content()" />`,
})
export default class LegalReturns {
  private readonly legalInfoService = inject(LegalInfoService);
  protected readonly content = computed(() => buildReturnsContent(this.legalInfoService.info()));
}
