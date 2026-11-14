import { formatRelativeTime, minutesToTimeInput, timeInputToMinutes } from './relative-time.helper';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Mediodía UTC: lejos de la medianoche en cualquier huso, así "mismo año" no depende de dónde
// corra el test.
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);
const ago = (ms: number): string => new Date(NOW - ms).toISOString();

describe('formatRelativeTime', () => {
  it('muestra "Recién" durante el primer minuto', () => {
    expect(formatRelativeTime(ago(0), NOW)).toBe('Recién');
    expect(formatRelativeTime(ago(59_000), NOW)).toBe('Recién');
  });

  it('muestra minutos y horas enteros', () => {
    expect(formatRelativeTime(ago(MINUTE), NOW)).toBe('Hace 1 min');
    expect(formatRelativeTime(ago(59 * MINUTE + 59_000), NOW)).toBe('Hace 59 min');
    expect(formatRelativeTime(ago(HOUR), NOW)).toBe('Hace 1 h');
    expect(formatRelativeTime(ago(23 * HOUR + 59 * MINUTE), NOW)).toBe('Hace 23 h');
  });

  it('muestra "Ayer" entre 24 y 48 horas, y después días', () => {
    expect(formatRelativeTime(ago(DAY), NOW)).toBe('Ayer');
    expect(formatRelativeTime(ago(2 * DAY - MINUTE), NOW)).toBe('Ayer');
    expect(formatRelativeTime(ago(2 * DAY), NOW)).toBe('Hace 2 días');
    expect(formatRelativeTime(ago(6 * DAY + 23 * HOUR), NOW)).toBe('Hace 6 días');
  });

  it('pasada una semana muestra la fecha, con año solo si es de otro año', () => {
    const sameYear = formatRelativeTime(ago(30 * DAY), NOW);
    const otherYear = formatRelativeTime(ago(400 * DAY), NOW);

    expect(sameYear).toContain('16');
    expect(sameYear).not.toContain('2026');
    expect(otherYear).toContain('2025');
  });

  it('no muestra fechas "en el futuro" si el reloj del cliente está atrasado', () => {
    expect(formatRelativeTime(new Date(NOW + 5 * MINUTE).toISOString(), NOW)).toBe('Recién');
  });

  it('devuelve vacío ante una fecha inválida', () => {
    expect(formatRelativeTime('no-es-una-fecha', NOW)).toBe('');
  });
});

describe('minutesToTimeInput / timeInputToMinutes', () => {
  it('convierte minutos al formato de <input type="time">', () => {
    expect(minutesToTimeInput(0)).toBe('00:00');
    expect(minutesToTimeInput(8 * 60)).toBe('08:00');
    expect(minutesToTimeInput(22 * 60 + 30)).toBe('22:30');
    expect(minutesToTimeInput(1439)).toBe('23:59');
  });

  it('acota valores fuera de rango', () => {
    expect(minutesToTimeInput(-10)).toBe('00:00');
    expect(minutesToTimeInput(5000)).toBe('23:59');
  });

  it('convierte la hora del input a minutos', () => {
    expect(timeInputToMinutes('00:00')).toBe(0);
    expect(timeInputToMinutes('22:30')).toBe(1350);
    expect(timeInputToMinutes('7:05')).toBe(425);
  });

  it('rechaza horas inválidas', () => {
    expect(timeInputToMinutes('')).toBeNull();
    expect(timeInputToMinutes('24:00')).toBeNull();
    expect(timeInputToMinutes('12:60')).toBeNull();
    expect(timeInputToMinutes('12:30:00')).toBeNull();
  });

  it('ida y vuelta conserva el valor', () => {
    for (const minutes of [0, 1, 480, 1320, 1439]) {
      expect(timeInputToMinutes(minutesToTimeInput(minutes))).toBe(minutes);
    }
  });
});
