const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const dateFormatter = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });
const dateWithYearFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/**
 * "Hace cuánto" en castellano rioplatense, corto, para la lista de notificaciones. Recibe `now`
 * como parámetro (no lee el reloj): así es una función pura y el componente decide cada cuánto
 * refrescar.
 */
export function formatRelativeTime(isoDate: string, now: number): string {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return '';

  // Un reloj del cliente apenas atrasado no debe mostrar "en el futuro".
  const elapsed = Math.max(0, now - then);

  if (elapsed < MINUTE) return 'Recién';
  if (elapsed < HOUR) return `Hace ${Math.floor(elapsed / MINUTE)} min`;
  if (elapsed < DAY) return `Hace ${Math.floor(elapsed / HOUR)} h`;
  if (elapsed < 2 * DAY) return 'Ayer';
  if (elapsed < 7 * DAY) return `Hace ${Math.floor(elapsed / DAY)} días`;

  const date = new Date(then);
  return date.getFullYear() === new Date(now).getFullYear()
    ? dateFormatter.format(date)
    : dateWithYearFormatter.format(date);
}

/** `"21:30"` <-> minutos desde medianoche, para los `<input type="time">` del horario de silencio. */
export function minutesToTimeInput(minutes: number): string {
  const safe = Math.min(1439, Math.max(0, Math.trunc(minutes)));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export function timeInputToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}
