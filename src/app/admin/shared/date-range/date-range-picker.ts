import { Component, computed, model, signal } from '@angular/core';

import {
  DATE_RANGE_PRESETS,
  DATE_RANGE_PRESET_LABELS,
  type DateRangePreset,
  type DateRangeSelection,
  resolveCustomDateRange,
  resolveDateRangePreset,
} from './date-range.model';

/** Convierte un instante UTC a un string `YYYY-MM-DD` de hora de Buenos Aires, para precargar los
 *  `&lt;input type="date"&gt;` del rango personalizado con el valor actualmente seleccionado. */
const AR_OFFSET_MS = 3 * 60 * 60 * 1000;
const toLocalDateInput = (utc: string): string => {
  const d = new Date(new Date(utc).getTime() + AR_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

/** Selector de período reutilizable (dashboard, reportes). Dos vías: un preset de la lista, o un
 *  rango personalizado con dos `&lt;input type="date"&gt;` nativos (no hace falta instalar ninguna
 *  librería de date-picker para esto). */
@Component({
  selector: 'app-date-range-picker',
  imports: [],
  templateUrl: './date-range-picker.html',
  styleUrl: './date-range-picker.css',
  host: { '(document:keydown.escape)': 'close()' },
})
export class DateRangePicker {
  protected readonly presets = DATE_RANGE_PRESETS;
  protected readonly presetLabels = DATE_RANGE_PRESET_LABELS;

  readonly value = model<DateRangeSelection>(resolveDateRangePreset('last30'));

  protected readonly open = signal(false);
  protected readonly customFrom = signal(toLocalDateInput(this.value().fromUtc));
  protected readonly customTo = signal(toLocalDateInput(new Date(new Date(this.value().toUtc).getTime() - 1).toISOString()));

  protected readonly isCustom = computed(() => this.value().preset === 'custom');

  protected toggleOpen(): void {
    this.open.update((v) => !v);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected selectPreset(preset: Exclude<DateRangePreset, 'custom'>): void {
    this.value.set(resolveDateRangePreset(preset));
    this.close();
  }

  protected onCustomFromChange(event: Event): void {
    this.customFrom.set((event.target as HTMLInputElement).value);
  }

  protected onCustomToChange(event: Event): void {
    this.customTo.set((event.target as HTMLInputElement).value);
  }

  protected applyCustomRange(): void {
    const from = this.customFrom();
    const to = this.customTo();
    if (!from || !to || from > to) return;
    this.value.set(resolveCustomDateRange(from, to));
    this.close();
  }
}
