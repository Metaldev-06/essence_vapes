import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ScentStyle {
  readonly id: string;
  readonly emoji: string;
  readonly label: string;
}

@Component({
  selector: 'app-finder',
  imports: [RouterLink],
  templateUrl: './finder.html',
  styleUrl: './finder.css',
})
export class Finder {
  protected readonly styles: readonly ScentStyle[] = [
    { id: 'fresco', emoji: '🌊', label: 'Fresco' },
    { id: 'dulce', emoji: '🍬', label: 'Dulce' },
    { id: 'intenso', emoji: '🔥', label: 'Intenso' },
    { id: 'elegante', emoji: '🕊️', label: 'Elegante' },
    { id: 'nocturno', emoji: '🌙', label: 'Nocturno' },
    { id: 'citrico', emoji: '🍋', label: 'Cítrico' },
  ];

  protected readonly selected = signal(new Set(['fresco', 'intenso', 'nocturno']));

  protected readonly selectedCount = computed(() => this.selected().size);

  protected readonly selectedParam = computed(() => Array.from(this.selected()).join(','));

  protected isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  protected toggle(id: string): void {
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
