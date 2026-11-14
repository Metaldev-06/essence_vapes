import {
  caretAfterDigits,
  countDigitsBefore,
  extractMoneyDigits,
  formatMoneyInput,
  moneyDigitsToValue,
} from './money-input.helper';

describe('formatMoneyInput', () => {
  it('muestra el importe con signo y puntos de miles, como en la tienda', () => {
    expect(formatMoneyInput(5)).toBe('$5');
    expect(formatMoneyInput(1000)).toBe('$1.000');
    expect(formatMoneyInput(100000)).toBe('$100.000');
    expect(formatMoneyInput(1234567)).toBe('$1.234.567');
    expect(formatMoneyInput(0)).toBe('$0');
  });

  it('queda vacío sin valor', () => {
    expect(formatMoneyInput(null)).toBe('');
    expect(formatMoneyInput(undefined)).toBe('');
    expect(formatMoneyInput(Number.NaN)).toBe('');
  });
});

describe('extractMoneyDigits', () => {
  it('toma lo que se tipea y lo ya formateado', () => {
    expect(extractMoneyDigits('100000')).toBe('100000');
    expect(extractMoneyDigits('$100.000')).toBe('100000');
    expect(extractMoneyDigits('$ 1.234.567')).toBe('1234567');
  });

  it('descarta los centavos de un importe pegado en formato argentino', () => {
    expect(extractMoneyDigits('$ 100.000,50')).toBe('100000');
    expect(extractMoneyDigits('1.000,5')).toBe('1000');
    expect(extractMoneyDigits('$100.000,')).toBe('100000');
  });

  it('una coma con tres cifras no es decimal: es un separador de miles', () => {
    expect(extractMoneyDigits('100,000')).toBe('100000');
  });

  it('ignora letras y quita ceros a la izquierda', () => {
    expect(extractMoneyDigits('$1a0b0')).toBe('100');
    expect(extractMoneyDigits('000500')).toBe('500');
    expect(extractMoneyDigits('0')).toBe('0');
    expect(extractMoneyDigits('$')).toBe('');
  });
});

describe('moneyDigitsToValue', () => {
  it('vacío es null y el resto un número', () => {
    expect(moneyDigitsToValue('')).toBeNull();
    expect(moneyDigitsToValue('0')).toBe(0);
    expect(moneyDigitsToValue('100000')).toBe(100000);
  });
});

describe('cursor', () => {
  it('cuenta los dígitos antes del cursor ignorando "$" y puntos', () => {
    expect(countDigitsBefore('$100.000', 0)).toBe(0);
    expect(countDigitsBefore('$100.000', 5)).toBe(3);
    expect(countDigitsBefore('$100.000', 8)).toBe(6);
  });

  it('ubica el cursor después del mismo dígito en el texto formateado', () => {
    expect(caretAfterDigits('$1.000', 1)).toBe(2);
    expect(caretAfterDigits('$1.000', 2)).toBe(4);
    expect(caretAfterDigits('$1.000', 4)).toBe(6);
    expect(caretAfterDigits('$1.000', 0)).toBe(1);
    expect(caretAfterDigits('$1.000', 99)).toBe(6);
    expect(caretAfterDigits('', 0)).toBe(0);
  });
});
