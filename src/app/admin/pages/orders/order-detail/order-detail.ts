import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { Order } from '../../../../core/orders/order.model';
import { orderStatusLabel, paymentStatusLabel } from '../../../../core/orders/order-status-labels';
import { extractErrorMessage } from '../../../data/extract-error-message';
import {
  OrdersAdminService,
  type PaymentAttemptRecord,
} from '../../../data/orders-admin.service';

/** `/admin/ventas/:id` - detalle de solo lectura (ver tarea: sin reembolsos manuales todavía). */
@Component({
  selector: 'app-admin-order-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.css',
})
export default class AdminOrderDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersAdminService = inject(OrdersAdminService);

  protected readonly order = signal<Order | null>(null);
  protected readonly attempts = signal<readonly PaymentAttemptRecord[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly orderStatusLabel = orderStatusLabel;
  protected readonly paymentStatusLabel = paymentStatusLabel;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
    else this.isLoading.set(false);
  }

  private async load(id: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const [order, attempts] = await Promise.all([
        this.ordersAdminService.getOne(id),
        this.ordersAdminService.getPaymentAttempts(id),
      ]);
      this.order.set(order);
      this.attempts.set(attempts);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}
