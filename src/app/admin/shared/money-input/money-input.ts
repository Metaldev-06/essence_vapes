import { Directive, ElementRef, effect, inject, model, output } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  MAX_MONEY_DIGITS,
  caretAfterDigits,
  countDigitsBefore,
  extractMoneyDigits,
  formatMoneyInput,
  moneyDigitsToValue,
} from './money-input.helper';

/**
 * Campo de importe en pesos con formato argentino mientras se escribe: el admin ve "$100.000",
 * el formulario guarda `100000`.
 *
 * Es una directiva sobre el `<input>` (no un componente que lo envuelva) para que el input siga
 * siendo del formulario que lo usa: conserva sus estilos, su `id` para el `<label>` y los
 * atributos `required`/`disabled` que Signal Forms le pone.
 *
 * Con `[formField]` funciona como control propio (`FormValueControl`): Signal Forms reconoce el
 * `model` llamado `value` y la salida `touch`. Sin formulario, se lee con
 * `#ref="appMoneyInput"` y `ref.value()`.
 */
@Directive({
  selector: 'input[appMoneyInput]',
  exportAs: 'appMoneyInput',
  host: {
    inputmode: 'numeric',
    autocomplete: 'off',
    '(input)': 'onInput($event)',
    '(blur)': 'touch.emit()',
  },
})
export class MoneyInput implements FormValueControl<number | null> {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  /** Importe en pesos enteros; `null` = campo vacío. */
  readonly value = model<number | null>(null);
  /** Avisa a Signal Forms que el campo fue tocado (para mostrar sus errores). */
  readonly touch = output<void>();

  constructor() {
    // Cambios que llegan de afuera (cargar un producto, copiarlo, resetear el formulario).
    effect(() => {
      const text = formatMoneyInput(this.value());
      if (this.input.value !== text) this.input.value = text;
    });
  }

  protected onInput(event: Event): void {
    const raw = this.input.value;
    const caret = this.input.selectionStart ?? raw.length;
    const previousValue = this.value();
    const previousDigits = previousValue === null ? '' : String(previousValue);

    let digits = extractMoneyDigits(raw);
    let digitsBefore = countDigitsBefore(raw, caret);

    // Borrar un "." o el "$" no cambia los dígitos, y el formato los volvería a poner: la tecla
    // parecería no hacer nada. Se borra el dígito de al lado, que es lo que se espera.
    const inputType = (event as InputEvent).inputType;
    if (digits === previousDigits) {
      if (inputType === 'deleteContentBackward' && digitsBefore > 0) {
        digits = digits.slice(0, digitsBefore - 1) + digits.slice(digitsBefore);
        digitsBefore -= 1;
      } else if (inputType === 'deleteContentForward' && digitsBefore < digits.length) {
        digits = digits.slice(0, digitsBefore) + digits.slice(digitsBefore + 1);
      }
    }

    // Lo que quede como ceros a la izquierda (ej. se borró el primer dígito de "1.000").
    const normalized = digits.replace(/^0+(?=\d)/, '');
    digitsBefore = Math.max(0, digitsBefore - (digits.length - normalized.length));

    if (normalized.length > MAX_MONEY_DIGITS) {
      // Se ignora lo tipeado: vuelve lo que había, con el cursor donde estaba antes de la tecla.
      const previousText = formatMoneyInput(previousValue);
      const insertedDigits = normalized.length - previousDigits.length;
      this.render(previousText, caretAfterDigits(previousText, digitsBefore - insertedDigits));
      return;
    }

    const value = moneyDigitsToValue(normalized);
    const formatted = formatMoneyInput(value);
    this.render(formatted, caretAfterDigits(formatted, Math.min(digitsBefore, normalized.length)));
    this.value.set(value);
  }

  private render(text: string, caret: number): void {
    this.input.value = text;
    this.input.setSelectionRange(caret, caret);
  }
}
