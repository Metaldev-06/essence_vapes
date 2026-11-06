import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompareService } from '../../../core/compare/compare.service';
import type { Product } from '../../data/product.model';

/** Global floating bar (mounted once in the app shell) that shows the current comparison list. */
@Component({
  selector: 'app-compare-tray',
  imports: [RouterLink],
  templateUrl: './compare-tray.html',
  styleUrl: './compare-tray.css',
})
export class CompareTray {
  protected readonly compareService = inject(CompareService);

  protected remove(product: Product): void {
    this.compareService.remove(product.id, product.variantId);
  }
}
