import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-decants-banner',
  imports: [RouterLink],
  templateUrl: './decants-banner.html',
  styleUrl: './decants-banner.css',
})
export class DecantsBanner {
  protected readonly sizes: readonly number[] = [2, 5, 10];

  protected readonly selectedSize = signal(this.sizes[0]);

  /** Matches the `?ml=` the products page's capacity filter reads on load. */
  protected readonly queryParams = computed(() => ({
    cat: 'decants',
    ml: this.selectedSize(),
  }));

  protected selectSize(ml: number): void {
    this.selectedSize.set(ml);
  }
}
