import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './core/seo/seo.service';
import { TabAttentionService } from './core/attention/tab-attention.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('essence_vapes_front');

  constructor() {
    inject(SeoService).init();
    inject(TabAttentionService).init();
  }
}
