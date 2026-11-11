import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, debounced, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';

import type { Order, OrderStatus, PaymentStatus } from '../../../core/orders/order.model';
import { orderStatusLabel, paymentStatusLabel } from '../../../core/orders/order-status-labels';
import { extractErrorMessage } from '../../data/extract-error-message';
import { OrdersAdminService, type OrdersStats } from '../../data/orders-admin.service';

const PAGE_SIZE = 20;

const ORDER_STATUS_OPTIONS: readonly { id: OrderStatus | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pending_payment', label: 'Esperando pago' },
  { id: 'processing', label: 'Pago en revisión' },
  { id: 'paid', label: 'Pagado' },
  { id: 'cancelled', label: 'Cancelado' },
  { id: 'expired', label: 'Vencido' },
  { id: 'refunded', label: 'Reembolsado' },
];

const PAYMENT_STATUS_OPTIONS: readonly { id: PaymentStatus | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pending', label: 'Pendiente' },
  { id: 'in_process', label: 'En revisión' },
  { id: 'approved', label: 'Aprobado' },
  { id: 'rejected', label: 'Rechazado' },
  { id: 'cancelled', label: 'Cancelado' },
  { id: 'refunded', label: 'Reembolsado' },
  { id: 'charged_back', label: 'Contracargo' },
];

/** `/admin/ventas` - panel de solo lectura sobre las órdenes reales (ver `OrdersAdminService`). */
@Component({
  selector: 'app-admin-orders',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export default class AdminOrders {
  private readonly ordersAdminService = inject(OrdersAdminService);
  private readonly router = inject(Router);

  protected readonly orderStatusOptions = ORDER_STATUS_OPTIONS;
  protected readonly paymentStatusOptions = PAYMENT_STATUS_OPTIONS;
  protected readonly orderStatusLabel = orderStatusLabel;
  protected readonly paymentStatusLabel = paymentStatusLabel;

  protected readonly status = signal<OrderStatus | 'todos'>('todos');
  protected readonly paymentStatus = signal<PaymentStatus | 'todos'>('todos');
  protected readonly search = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly offset = signal(0);
  private readonly debouncedSearch = debounced(this.search, 300);

  protected readonly items = signal<readonly Order[]>([]);
  protected readonly total = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly stats = signal<OrdersStats | null>(null);

  protected readonly page = computed(() => Math.floor(this.offset() / PAGE_SIZE) + 1);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly hasPrev = computed(() => this.offset() > 0);
  protected readonly hasNext = computed(() => this.offset() + PAGE_SIZE < this.total());

  constructor() {
    void this.loadStats();

    effect(() => {
      this.status();
      this.paymentStatus();
      this.debouncedSearch.value();
      this.dateFrom();
      this.dateTo();
      untracked(() => this.offset.set(0));
    });

    effect(() => {
      const status = this.status();
      const paymentStatus = this.paymentStatus();
      const search = this.debouncedSearch.value();
      const dateFrom = this.dateFrom();
      const dateTo = this.dateTo();
      const offset = this.offset();
      untracked(() => void this.load(status, paymentStatus, search, dateFrom, dateTo, offset));
    });
  }

  protected prevPage(): void {
    if (this.hasPrev()) this.offset.update((value) => Math.max(0, value - PAGE_SIZE));
  }

  protected nextPage(): void {
    if (this.hasNext()) this.offset.update((value) => value + PAGE_SIZE);
  }

  protected goToOrder(id: string): void {
    void this.router.navigateByUrl(`/admin/ventas/${id}`);
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatusChange(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as OrderStatus | 'todos');
  }

  protected onPaymentStatusChange(event: Event): void {
    this.paymentStatus.set((event.target as HTMLSelectElement).value as PaymentStatus | 'todos');
  }

  protected onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
  }

  protected onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.status.set('todos');
    this.paymentStatus.set('todos');
    this.search.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  private async loadStats(): Promise<void> {
    try {
      this.stats.set(await this.ordersAdminService.getStats());
    } catch {
      /* Los indicadores son un extra - si fallan, la lista sigue funcionando igual. */
    }
  }

  private async load(
    status: OrderStatus | 'todos',
    paymentStatus: PaymentStatus | 'todos',
    search: string,
    dateFrom: string,
    dateTo: string,
    offset: number,
  ): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const page = await this.ordersAdminService.list({
        status: status === 'todos' ? undefined : status,
        paymentStatus: paymentStatus === 'todos' ? undefined : paymentStatus,
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      this.items.set(page.data);
      this.total.set(page.pagination.total);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}
