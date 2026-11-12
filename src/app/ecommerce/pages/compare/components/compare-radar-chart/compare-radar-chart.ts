import { NgOptimizedImage } from '@angular/common';
import { Component, input } from '@angular/core';
import { cloudinaryUrl } from '../../../../data/cloudinary-url.helper';
import { SERIES_COLORS, type RadarGeometry } from '../../compare.types';
import type { Product } from '../../../../data/product.model';

@Component({
  selector: 'app-compare-radar-chart',
  imports: [NgOptimizedImage],
  templateUrl: './compare-radar-chart.html',
  styleUrl: './compare-radar-chart.css',
})
export class CompareRadarChart {
  readonly radar = input.required<RadarGeometry>();
  readonly products = input.required<readonly Product[]>();
  protected readonly cloudinaryUrl = cloudinaryUrl;

  protected seriesColor(index: number): string {
    return SERIES_COLORS[index % SERIES_COLORS.length];
  }
}
