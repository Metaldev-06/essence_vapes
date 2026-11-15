import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SeoService } from './core/seo/seo.service';
import { TabAttentionService } from './core/attention/tab-attention.service';
import { RateLimitModal } from './core/http/rate-limit-modal/rate-limit-modal';
import { RateLimitService } from './core/http/rate-limit.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RateLimitModal],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('essence_vapes_front');
  protected readonly rateLimit = inject(RateLimitService);

  constructor() {
    inject(SeoService).init();
    inject(TabAttentionService).init();
  }
}
