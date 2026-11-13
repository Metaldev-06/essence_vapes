import { Component, input } from '@angular/core';

/** Estado vacío reutilizable para listados/tablas del admin (sin resultados, sin datos en el
 *  período, etc) - evita que cada página reimplemente su propio mensaje. */
@Component({
  selector: 'app-empty-state',
  imports: [],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
