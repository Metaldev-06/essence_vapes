import { Component, input } from '@angular/core';
import { SERIES_COLORS, type DotRow } from '../../compare.types';

@Component({
  selector: 'app-compare-dot-rows',
  imports: [],
  templateUrl: './compare-dot-rows.html',
  styleUrl: './compare-dot-rows.css',
})
export class CompareDotRows {
  readonly rows = input.required<readonly DotRow[]>();

  protected seriesColor(index: number): string {
    return SERIES_COLORS[index % SERIES_COLORS.length];
  }
}
