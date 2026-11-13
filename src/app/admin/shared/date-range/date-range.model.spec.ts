import { resolveCustomDateRange, resolveDateRangePreset } from './date-range.model';

describe('date-range.model', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('resolveDateRangePreset - mid-month (2026-11-12, sin cambio de mes/año)', () => {
    beforeEach(() => {
      // 2026-11-12 15:30 hora de Buenos Aires (UTC-3) = 2026-11-12T18:30:00Z.
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-12T18:30:00.000Z'));
    });

    it('today - cubre el día calendario de Buenos Aires, comparado contra ayer', () => {
      const range = resolveDateRangePreset('today');
      expect(range.fromUtc).toBe('2026-11-12T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-11-13T03:00:00.000Z');
      expect(range.previousFromUtc).toBe('2026-11-11T03:00:00.000Z');
      expect(range.previousToUtc).toBe(range.fromUtc);
    });

    it('yesterday - encadena exactamente con el inicio de "today"', () => {
      const range = resolveDateRangePreset('yesterday');
      expect(range.fromUtc).toBe('2026-11-11T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-11-12T03:00:00.000Z');
      expect(range.previousFromUtc).toBe('2026-11-10T03:00:00.000Z');
    });

    it('last7 - incluye hoy + 6 días anteriores, comparado contra los 7 días previos', () => {
      const range = resolveDateRangePreset('last7');
      expect(range.fromUtc).toBe('2026-11-06T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-11-13T03:00:00.000Z');
      expect(range.previousFromUtc).toBe('2026-10-30T03:00:00.000Z');
      expect(range.previousToUtc).toBe(range.fromUtc);
    });

    it('last30 - ventana de 30 días terminando hoy', () => {
      const range = resolveDateRangePreset('last30');
      expect(range.fromUtc).toBe('2026-10-14T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-11-13T03:00:00.000Z');
    });

    it('last90 - ventana de 90 días terminando hoy', () => {
      const range = resolveDateRangePreset('last90');
      expect(range.fromUtc).toBe('2026-08-15T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-11-13T03:00:00.000Z');
    });

    it('this_month - mes calendario completo, comparado contra el mes anterior', () => {
      const range = resolveDateRangePreset('this_month');
      expect(range.fromUtc).toBe('2026-11-01T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-12-01T03:00:00.000Z');
      expect(range.previousFromUtc).toBe('2026-10-01T03:00:00.000Z');
      expect(range.previousToUtc).toBe(range.fromUtc);
    });

    it('last_month', () => {
      const range = resolveDateRangePreset('last_month');
      expect(range.fromUtc).toBe('2026-10-01T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-11-01T03:00:00.000Z');
      expect(range.previousFromUtc).toBe('2026-09-01T03:00:00.000Z');
    });

    it('this_year', () => {
      const range = resolveDateRangePreset('this_year');
      expect(range.fromUtc).toBe('2026-01-01T03:00:00.000Z');
      expect(range.toUtc).toBe('2027-01-01T03:00:00.000Z');
      expect(range.previousFromUtc).toBe('2025-01-01T03:00:00.000Z');
    });

    it('last_year', () => {
      const range = resolveDateRangePreset('last_year');
      expect(range.fromUtc).toBe('2025-01-01T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-01-01T03:00:00.000Z');
      expect(range.previousFromUtc).toBe('2024-01-01T03:00:00.000Z');
    });
  });

  describe('resolveDateRangePreset - cambio de mes y de año (2026-01-15)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      // 2026-01-15 12:00 hora de Buenos Aires = 2026-01-15T15:00:00Z.
      vi.setSystemTime(new Date('2026-01-15T15:00:00.000Z'));
    });

    it('this_month en enero compara contra diciembre del año anterior', () => {
      const range = resolveDateRangePreset('this_month');
      expect(range.fromUtc).toBe('2026-01-01T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-02-01T03:00:00.000Z');
      expect(range.previousFromUtc).toBe('2025-12-01T03:00:00.000Z');
      expect(range.previousToUtc).toBe(range.fromUtc);
    });

    it('last_month en enero es diciembre del año anterior, comparado contra noviembre', () => {
      const range = resolveDateRangePreset('last_month');
      expect(range.fromUtc).toBe('2025-12-01T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-01-01T03:00:00.000Z');
      expect(range.previousFromUtc).toBe('2025-11-01T03:00:00.000Z');
    });

    it('last7 cruzando el 1ro de enero no rompe el cálculo', () => {
      const range = resolveDateRangePreset('last7');
      expect(range.fromUtc).toBe('2026-01-09T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-01-16T03:00:00.000Z');
    });
  });

  describe('resolveCustomDateRange', () => {
    it('cubre el día final completo (inclusive) y compara contra el mismo tramo anterior', () => {
      const range = resolveCustomDateRange('2026-02-01', '2026-02-10');
      expect(range.preset).toBe('custom');
      expect(range.fromUtc).toBe('2026-02-01T03:00:00.000Z');
      // 10 días cubiertos (1 al 10 inclusive) => el exclusivo "to" es el 11.
      expect(range.toUtc).toBe('2026-02-11T03:00:00.000Z');
      expect(range.previousFromUtc).toBe('2026-01-22T03:00:00.000Z');
      expect(range.previousToUtc).toBe(range.fromUtc);
    });

    it('un solo día (from === to) cubre exactamente ese día calendario', () => {
      const range = resolveCustomDateRange('2026-05-20', '2026-05-20');
      expect(range.fromUtc).toBe('2026-05-20T03:00:00.000Z');
      expect(range.toUtc).toBe('2026-05-21T03:00:00.000Z');
    });
  });
});
