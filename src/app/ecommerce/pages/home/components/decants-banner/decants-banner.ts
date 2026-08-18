import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface DecantSize {
  readonly ml: string;
  readonly from: string;
}

@Component({
  selector: 'app-decants-banner',
  imports: [RouterLink],
  templateUrl: './decants-banner.html',
  styleUrl: './decants-banner.css',
})
export class DecantsBanner {
  protected readonly sizes: readonly DecantSize[] = [
    { ml: '2ml', from: 'desde $1.200' },
    { ml: '5ml', from: 'desde $2.800' },
    { ml: '10ml', from: 'desde $4.500' },
  ];

  protected readonly selectedSize = signal(this.sizes[0].ml);

  protected selectSize(ml: string): void {
    this.selectedSize.set(ml);
  }
}
