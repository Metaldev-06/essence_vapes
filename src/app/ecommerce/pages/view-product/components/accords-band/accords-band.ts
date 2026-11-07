import { Component, computed, input } from '@angular/core';
import type { Product } from '../../../../data/product.model';

@Component({
  selector: 'app-accords-band',
  imports: [],
  templateUrl: './accords-band.html',
  styleUrl: './accords-band.css',
})
export class AccordsBand {
  readonly product = input.required<Product>();

  protected readonly pills = computed(() => this.product().accords ?? this.product().notes);

  protected readonly description = computed(() => {
    const notes = this.product().notes;
    if (notes.length === 0) return '';
    const list =
      notes.length === 1
        ? notes[0]
        : `${notes.slice(0, -1).join(', ')} y ${notes[notes.length - 1]}`;
    return `Una composición que combina ${list}.`;
  });

  protected readonly hasContent = computed(
    () => this.pills().length > 0 || this.description().length > 0,
  );
}
