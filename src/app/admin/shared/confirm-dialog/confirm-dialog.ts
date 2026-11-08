import { Component, input, output } from '@angular/core';

export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  /** Secondary line below the message - e.g. the "use the Visible switch instead" hint. */
  readonly note?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** 'danger' (default) styles the confirm button red, for destructive actions like delete. */
  readonly tone?: 'danger' | 'default';
}

/**
 * Generic confirm/cancel modal - replaces the browser's native `confirm()` (unstyled, blocks the
 * whole tab, can't be customized) for actions that need a confirmation step. Rendered only while
 * `data()` is non-null. Closing via the backdrop, Escape, or the cancel button all emit
 * `cancelled`; only the confirm button emits `confirmed`.
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  readonly data = input<ConfirmDialogData | null>(null);
  readonly confirmed = output();
  readonly cancelled = output();
}
