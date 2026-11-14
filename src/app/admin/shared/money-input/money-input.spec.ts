import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormField, form, min, required } from '@angular/forms/signals';

import { MoneyInput } from './money-input';

@Component({
  imports: [FormField, MoneyInput],
  template: `<input id="price" type="text" appMoneyInput [formField]="priceForm.price" />`,
})
class FormHost {
  readonly model = signal<{ price: number | null }>({ price: null });
  readonly priceForm = form(this.model, (path) => {
    required(path.price);
    min(path.price, 1);
  });
}

@Component({
  imports: [MoneyInput],
  template: `<input type="text" appMoneyInput #price="appMoneyInput" [value]="initial()" />`,
})
class StandaloneHost {
  readonly initial = signal<number | null>(25000);
}

/**
 * Simula lo que hace el navegador con una tecla: deja el texto nuevo con el cursor en `caret`
 * y dispara el evento `input`.
 */
function typeInto(input: HTMLInputElement, text: string, caret: number, inputType = 'insertText'): void {
  input.value = text;
  input.setSelectionRange(caret, caret);
  input.dispatchEvent(new InputEvent('input', { inputType, bubbles: true }));
}

describe('MoneyInput con Signal Forms', () => {
  let fixture: ComponentFixture<FormHost>;
  let host: FormHost;
  let input: HTMLInputElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(FormHost);
    host = fixture.componentInstance;
    await fixture.whenStable();
    input = fixture.nativeElement.querySelector('input');
  });

  it('formatea mientras se escribe y guarda el número en el formulario', async () => {
    typeInto(input, '1', 1);
    typeInto(input, '$10', 3);
    typeInto(input, '$100', 4);
    typeInto(input, '$1000', 5);
    await fixture.whenStable();

    expect(input.value).toBe('$1.000');
    expect(input.selectionStart).toBe(6);
    expect(host.model().price).toBe(1000);

    typeInto(input, '$1.0000', 7);
    typeInto(input, '$10.0000', 8);
    await fixture.whenStable();

    expect(input.value).toBe('$100.000');
    expect(host.model().price).toBe(100000);
  });

  it('muestra formateado un valor que llega de afuera (editar un producto)', async () => {
    host.model.set({ price: 250000 });
    await fixture.whenStable();

    expect(input.value).toBe('$250.000');
  });

  it('borrar un punto borra el dígito de al lado, y el cursor queda en su lugar', async () => {
    host.model.set({ price: 12345 });
    await fixture.whenStable();
    expect(input.value).toBe('$12.345');

    // Backspace con el cursor justo después del punto: el navegador borra el ".".
    typeInto(input, '$12345', 3, 'deleteContentBackward');
    await fixture.whenStable();

    expect(input.value).toBe('$1.345');
    expect(input.selectionStart).toBe(2);
    expect(host.model().price).toBe(1345);
  });

  it('suprimir sobre un punto borra el dígito siguiente', async () => {
    host.model.set({ price: 12345 });
    await fixture.whenStable();

    // Supr con el cursor justo antes del punto.
    typeInto(input, '$12345', 3, 'deleteContentForward');
    await fixture.whenStable();

    expect(input.value).toBe('$1.245');
    expect(host.model().price).toBe(1245);
  });

  it('vaciar el campo deja el valor en null y el campo requerido inválido', async () => {
    host.model.set({ price: 500 });
    await fixture.whenStable();

    typeInto(input, '', 0, 'deleteContentBackward');
    await fixture.whenStable();

    expect(input.value).toBe('');
    expect(host.model().price).toBeNull();
    expect(host.priceForm.price().invalid()).toBe(true);
  });

  it('ignora letras sin mover lo escrito', async () => {
    host.model.set({ price: 100 });
    await fixture.whenStable();

    typeInto(input, '$10a0', 4);
    await fixture.whenStable();

    expect(input.value).toBe('$100');
    expect(host.model().price).toBe(100);
  });

  it('un importe pegado con centavos queda en pesos enteros', async () => {
    typeInto(input, '$ 100.000,50', 12, 'insertFromPaste');
    await fixture.whenStable();

    expect(input.value).toBe('$100.000');
    expect(host.model().price).toBe(100000);
  });

  it('no acepta más de 12 dígitos', async () => {
    host.model.set({ price: 999999999999 });
    await fixture.whenStable();

    typeInto(input, '$999.999.999.9999', 17);
    await fixture.whenStable();

    expect(input.value).toBe('$999.999.999.999');
    expect(host.model().price).toBe(999999999999);
  });

  it('al salir del campo lo marca como tocado (para mostrar sus errores)', async () => {
    expect(host.priceForm.price().touched()).toBe(false);

    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(host.priceForm.price().touched()).toBe(true);
  });

  it('conserva los atributos que el formulario le pone al input', () => {
    expect(input.required).toBe(true);
    expect(input.id).toBe('price');
    expect(input.getAttribute('inputmode')).toBe('numeric');
  });
});

describe('MoneyInput sin formulario', () => {
  it('muestra el valor inicial y expone el número escrito', async () => {
    const fixture = TestBed.createComponent(StandaloneHost);
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.value).toBe('$25.000');

    typeInto(input, '$25.0000', 8);
    await fixture.whenStable();

    const directive = fixture.debugElement.children[0].references['price'] as MoneyInput;
    expect(input.value).toBe('$250.000');
    expect(directive.value()).toBe(250000);
  });
});
