import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { SERIES_COLORS, type MetricRow } from '../../compare.types';
import type { Product } from '../../../../data/product.model';

@Component({
  selector: 'app-compare-metric-rows',
  imports: [NgOptimizedImage],
  templateUrl: './compare-metric-rows.html',
  styleUrl: './compare-metric-rows.css',
})
export class CompareMetricRows {
  readonly rows = input.required<readonly MetricRow[]>();
  readonly products = input.required<readonly Product[]>();

  protected seriesColor(index: number): string {
    return SERIES_COLORS[index % SERIES_COLORS.length];
  }
}
