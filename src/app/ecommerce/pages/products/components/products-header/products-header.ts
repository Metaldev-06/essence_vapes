import { Component, input } from '@angular/core';

@Component({
  selector: 'app-products-header',
  imports: [],
  templateUrl: './products-header.html',
  styleUrl: './products-header.css',
})
export class ProductsHeader {
  readonly count = input.required<number>();
}
