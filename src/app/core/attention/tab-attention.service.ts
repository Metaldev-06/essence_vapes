import { DestroyRef, Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const AWAY_TITLE = 'Volvé, tu fragancia te espera 🌸';

@Injectable({ providedIn: 'root' })
export class TabAttentionService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private awayFromTabTitle: string | null = null;

  /** Swaps the tab title for an attention-grabbing message while the tab is hidden. */
  init(): void {
    const handler = (): void => this.onVisibilityChange();
    this.document.addEventListener('visibilitychange', handler);
    this.destroyRef.onDestroy(() => this.document.removeEventListener('visibilitychange', handler));
  }

  private onVisibilityChange(): void {
    if (this.document.hidden) {
      this.awayFromTabTitle = this.document.title;
      this.document.title = AWAY_TITLE;
    } else if (this.awayFromTabTitle !== null) {
      this.document.title = this.awayFromTabTitle;
      this.awayFromTabTitle = null;
    }
  }
}
