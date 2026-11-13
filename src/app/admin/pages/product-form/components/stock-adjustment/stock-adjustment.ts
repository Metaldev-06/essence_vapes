import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';

import { extractErrorMessage } from '../../../../data/extract-error-message';
import {
  ProductsAdminService,
  type StockMovementRecord,
} from '../../../../data/products-admin.service';
import type { Product } from '../../../../../ecommerce/data/product.model';

/** Ajuste manual de stock + historial de movimientos (ver tarea, punto 5.3). */
@Component({
  selector: 'app-stock-adjustment',
  imports: [DatePipe],
  templateUrl: './stock-adjustment.html',
  styleUrl: './stock-adjustment.css',
})
export class StockAdjustment {
  private readonly productsAdminService = inject(ProductsAdminService);

  readonly productId = input.required<string>();
  readonly adjusted = output<Product>();

  protected readonly quantityChange = signal('');
  protected readonly reason = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly canSubmit = computed(() => {
    const qty = Number(this.quantityChange());
    return Number.isFinite(qty) && qty !== 0 && this.reason().trim() !== '';
  });

  protected readonly movements = signal<readonly StockMovementRecord[]>([]);
  protected readonly loadingMovements = signal(true);

  constructor() {
    void this.loadMovements();
  }

  protected onQuantityChange(event: Event): void {
    this.quantityChange.set((event.target as HTMLInputElement).value);
  }

  protected onReasonChange(event: Event): void {
    this.reason.set((event.target as HTMLInputElement).value);
  }

  protected async submit(): Promise<void> {
    const qty = Number(this.quantityChange());
    const reason = this.reason().trim();

    if (!Number.isFinite(qty) || qty === 0) {
      this.error.set('Ingresá una cantidad distinta de 0 (negativa para restar).');
      return;
    }
    if (!reason) {
      this.error.set('El motivo es obligatorio.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      await this.productsAdminService.adjustStock(this.productId(), 'base', qty, reason);
      this.quantityChange.set('');
      this.reason.set('');
      const [product] = await Promise.all([
        this.productsAdminService.get(this.productId()),
        this.loadMovements(),
      ]);
      this.adjusted.emit(product);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  private async loadMovements(): Promise<void> {
    this.loadingMovements.set(true);
    try {
      this.movements.set(await this.productsAdminService.getStockMovements(this.productId()));
    } catch {
      // Panel secundario - si falla, el ajuste de stock de arriba sigue funcionando igual.
    } finally {
      this.loadingMovements.set(false);
    }
  }
}
