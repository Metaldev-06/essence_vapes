import { Component, input, model } from '@angular/core';
import type { FormCheckboxControl } from '@angular/forms/signals';

/**
 * Accessible on/off switch (`role="switch"`). Implements Signal Forms' `FormCheckboxControl`, so it
 * binds straight to a boolean field with `[formField]`, and also works standalone via `[(checked)]`.
 * With a visible `label` the button's own text names it; otherwise pass `ariaLabel`.
 */
@Component({
  selector: 'app-toggle-switch',
  templateUrl: './toggle-switch.html',
  styleUrl: './toggle-switch.css',
})
export class ToggleSwitch implements FormCheckboxControl {
  readonly checked = model(false);
  readonly touched = model(false);
  readonly disabled = input(false);
  /** Shows a spinner-like pulse on the thumb while the parent persists the change. */
  readonly busy = input(false);
  readonly label = input<string>();
  readonly hint = input<string>();
  readonly ariaLabel = input<string>();

  protected toggle(): void {
    if (this.disabled() || this.busy()) return;
    this.checked.update((value) => !value);
    this.touched.set(true);
  }
}
