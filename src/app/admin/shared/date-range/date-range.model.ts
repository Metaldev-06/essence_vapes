/**
 * Selector de período reutilizable para todo el admin (dashboard, reportes). Cálculo de rangos
 * puro - sin Angular, sin librería de fechas: Argentina no aplica horario de verano desde 2009
 * (UTC-3 fijo todo el año), así que alcanza con un offset constante en vez de `Intl`/una librería
 * de zonas horarias para resolver "hoy", "este mes", etc. en hora de Buenos Aires.
 *
 * Cada período se representa como `[fromUtc, toUtc)` - `toUtc` es EXCLUSIVO (el instante UTC del
 * inicio del día siguiente al último día incluido), para que los consumidores puedan filtrar con
 * `>= from AND < to` sin casos especiales de "23:59:59.999".
 */

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'this_month'
  | 'last_month'
  | 'last90'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface DateRangeSelection {
  readonly preset: DateRangePreset;
  readonly label: string;
  readonly fromUtc: string;
  readonly toUtc: string;
  /** Período anterior equivalente, para la comparación porcentual (ver KPIs del dashboard). */
  readonly previousFromUtc: string;
  readonly previousToUtc: string;
}

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  last7: 'Últimos 7 días',
  last30: 'Últimos 30 días',
  this_month: 'Este mes',
  last_month: 'Mes anterior',
  last90: 'Últimos 90 días',
  this_year: 'Este año',
  last_year: 'Año anterior',
  custom: 'Rango personalizado',
};

export const DATE_RANGE_PRESETS: readonly Exclude<DateRangePreset, 'custom'>[] = [
  'today',
  'yesterday',
  'last7',
  'last30',
  'this_month',
  'last_month',
  'last90',
  'this_year',
  'last_year',
];

const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const nowInBuenosAires = (): Date => new Date(Date.now() - AR_OFFSET_MS);

/** Medianoche de un día calendario de Buenos Aires, como instante UTC real. Acepta mes/día fuera
 *  de rango (ej. mes -1 o 12) - `Date.UTC` ya resuelve el acarreo de año correctamente. */
const baMidnightUtc = (year: number, month: number, day: number): Date =>
  new Date(Date.UTC(year, month, day, 0, 0, 0, 0) + AR_OFFSET_MS);

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

interface ResolvedRange {
  readonly from: Date;
  readonly to: Date;
  readonly previousFrom: Date;
  readonly previousTo: Date;
}

/** Ventana de N días terminando hoy (incluido) - la comparación es la misma cantidad de días
 *  inmediatamente anterior. Cubre 'today'/'yesterday'/'last7'/'last30'/'last90'. */
const trailingDaysRange = (todayStart: Date, daysIncludingToday: number): ResolvedRange => {
  const from = addDays(todayStart, -(daysIncludingToday - 1));
  const to = addDays(todayStart, 1);
  const span = to.getTime() - from.getTime();
  return { from, to, previousFrom: new Date(from.getTime() - span), previousTo: from };
};

const buildPreset = (preset: Exclude<DateRangePreset, 'custom'>): ResolvedRange => {
  const now = nowInBuenosAires();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const todayStart = baMidnightUtc(y, m, d);

  switch (preset) {
    case 'today':
      return trailingDaysRange(todayStart, 1);
    case 'yesterday': {
      const from = addDays(todayStart, -1);
      return { from, to: todayStart, previousFrom: addDays(from, -1), previousTo: from };
    }
    case 'last7':
      return trailingDaysRange(todayStart, 7);
    case 'last30':
      return trailingDaysRange(todayStart, 30);
    case 'last90':
      return trailingDaysRange(todayStart, 90);
    case 'this_month': {
      const from = baMidnightUtc(y, m, 1);
      const to = baMidnightUtc(y, m + 1, 1);
      return { from, to, previousFrom: baMidnightUtc(y, m - 1, 1), previousTo: from };
    }
    case 'last_month': {
      const from = baMidnightUtc(y, m - 1, 1);
      const to = baMidnightUtc(y, m, 1);
      return { from, to, previousFrom: baMidnightUtc(y, m - 2, 1), previousTo: from };
    }
    case 'this_year': {
      const from = baMidnightUtc(y, 0, 1);
      const to = baMidnightUtc(y + 1, 0, 1);
      return { from, to, previousFrom: baMidnightUtc(y - 1, 0, 1), previousTo: from };
    }
    case 'last_year': {
      const from = baMidnightUtc(y - 1, 0, 1);
      const to = baMidnightUtc(y, 0, 1);
      return { from, to, previousFrom: baMidnightUtc(y - 2, 0, 1), previousTo: from };
    }
  }
};

export const resolveDateRangePreset = (
  preset: Exclude<DateRangePreset, 'custom'>,
): DateRangeSelection => {
  const { from, to, previousFrom, previousTo } = buildPreset(preset);
  return {
    preset,
    label: DATE_RANGE_PRESET_LABELS[preset],
    fromUtc: from.toISOString(),
    toUtc: to.toISOString(),
    previousFromUtc: previousFrom.toISOString(),
    previousToUtc: previousTo.toISOString(),
  };
};

/** `fromLocalDate`/`toLocalDate`: strings `YYYY-MM-DD`, tal como los produce un
 *  `&lt;input type="date"&gt;` - ambos extremos inclusive (el día final se cubre completo). */
export const resolveCustomDateRange = (
  fromLocalDate: string,
  toLocalDate: string,
): DateRangeSelection => {
  const [fy, fm, fd] = fromLocalDate.split('-').map(Number);
  const [ty, tm, td] = toLocalDate.split('-').map(Number);
  const from = baMidnightUtc(fy, fm - 1, fd);
  const to = addDays(baMidnightUtc(ty, tm - 1, td), 1);
  const span = to.getTime() - from.getTime();
  return {
    preset: 'custom',
    label: DATE_RANGE_PRESET_LABELS.custom,
    fromUtc: from.toISOString(),
    toUtc: to.toISOString(),
    previousFromUtc: new Date(from.getTime() - span).toISOString(),
    previousToUtc: from.toISOString(),
  };
};
