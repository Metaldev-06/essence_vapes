import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-compare-star-rating',
  imports: [],
  templateUrl: './compare-star-rating.html',
  styleUrl: './compare-star-rating.css',
})
export class CompareStarRating {
  readonly rating = input.required<number>();
  readonly ratingCount = input<number>(0);

  protected readonly starFills = computed(() => {
    const rating = this.rating();
    return [1, 2, 3, 4, 5].map((step) => Math.min(100, Math.max(0, (rating - (step - 1)) * 100)));
  });
}
