import { Component } from '@angular/core';

import { buildCookiesContent } from './content/cookies.content';
import { LegalPage } from './legal-page/legal-page';

@Component({
  selector: 'app-legal-cookies',
  imports: [LegalPage],
  template: `<app-legal-page [content]="content" />`,
})
export default class LegalCookies {
  protected readonly content = buildCookiesContent();
}
