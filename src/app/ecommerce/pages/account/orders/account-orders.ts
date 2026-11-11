import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Order } from '../../../../core/orders/order.model';
import { orderStatusLabel, paymentStatusLabel } from '../../../../core/orders/order-status-labels';
import { OrdersService } from '../../../../core/orders/orders.service';

const PAGE_SIZE = 10;

/** `/cuenta/pedidos` - historial real de compras (ver `OrdersService`). */
@Component({
  selector: 'app-account-orders',
  imports: [RouterLink, DatePipe],
  templateUrl: './account-orders.html',
  styleUrl: './account-orders.css',
})
export default class AccountOrders {
  private readonly ordersService = inject(OrdersService);

  protected readonly orders = signal<Order[]>([]);
  protected readonly total = signal(0);
  protected readonly offset = signal(0);
  protected readonly isLoading = signal(true);

  protected readonly orderStatusLabel = orderStatusLabel;
  protected readonly paymentStatusLabel = paymentStatusLabel;

  constructor() {
    void this.load();
  }

  protected hasPrev(): boolean {
    return this.offset() > 0;
  }

  protected hasNext(): boolean {
    return this.offset() + PAGE_SIZE < this.total();
  }

  protected async prevPage(): Promise<void> {
    this.offset.set(Math.max(0, this.offset() - PAGE_SIZE));
    await this.load();
  }

  protected async nextPage(): Promise<void> {
    this.offset.set(this.offset() + PAGE_SIZE);
    await this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    const result = await this.ordersService.myOrders(PAGE_SIZE, this.offset());
    this.orders.set(result?.data ?? []);
    this.total.set(result?.pagination.total ?? 0);
    this.isLoading.set(false);
  }
}
