import { Component, input, output } from '@angular/core';

export interface ToastMessage {
  readonly message: string;
  readonly tone: 'success' | 'error';
}

/** Bottom-corner notice. The live region is always rendered so screen readers announce each message. */
@Component({
  selector: 'app-toast',
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class Toast {
  readonly toast = input<ToastMessage | null>(null);
  readonly dismissed = output();
}
