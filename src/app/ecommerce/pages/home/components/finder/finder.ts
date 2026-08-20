import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SCENT_STYLE_OPTIONS } from '../../../../data/scent-styles';
import type { ScentStyle } from '../../../../data/product.model';

@Component({
  selector: 'app-finder',
  imports: [RouterLink],
  templateUrl: './finder.html',
  styleUrl: './finder.css',
})
export class Finder {
  protected readonly styles = SCENT_STYLE_OPTIONS;

  protected readonly selected = signal<ReadonlySet<ScentStyle>>(new Set(['fresco', 'intenso', 'nocturno']));

  protected readonly selectedCount = computed(() => this.selected().size);

  protected readonly selectedParam = computed(() => Array.from(this.selected()).join(','));

  protected isSelected(id: ScentStyle): boolean {
    return this.selected().has(id);
  }

  protected toggle(id: ScentStyle): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }
}
