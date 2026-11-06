import { Component, input } from '@angular/core';

export interface LegalSection {
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly list?: readonly string[];
}

export interface LegalContent {
  readonly title: string;
  readonly intro?: string;
  readonly lastUpdated?: string;
  readonly sections: readonly LegalSection[];
  readonly disclaimer?: string;
}

/** Shell reutilizable para toda página legal (términos, privacidad, cookies, envíos, etc.). */
@Component({
  selector: 'app-legal-page',
  templateUrl: './legal-page.html',
  styleUrl: './legal-page.css',
})
export class LegalPage {
  readonly content = input.required<LegalContent>();
}
