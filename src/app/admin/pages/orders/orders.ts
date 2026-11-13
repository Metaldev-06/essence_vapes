import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, debounced, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';

import type {
  DeliveryMethod,
  LogisticsStatus,
  Order,
  OrderStatus,
  PaymentStatus,
} from '../../../core/orders/order.model';
import {
  deliveryMethodLabel,
  logisticsStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
} from '../../../core/orders/order-status-labels';
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

const DELIVERY_METHOD_OPTIONS: readonly { id: DeliveryMethod | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todas' },
  { id: 'home_delivery', label: 'Envío a domicilio' },
  { id: 'pickup', label: 'Retiro en el local' },
];

const LOGISTICS_STATUS_OPTIONS: readonly { id: LogisticsStatus | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pending_preparation', label: 'Pendiente de preparación' },
  { id: 'in_preparation', label: 'En preparación' },
  { id: 'ready_to_ship', label: 'Listo para despachar' },
  { id: 'dispatched', label: 'Despachado' },
  { id: 'in_transit', label: 'En camino' },
  { id: 'delivered', label: 'Entregado' },
  { id: 'delivery_issue', label: 'Incidencia de entrega' },
  { id: 'ready_for_pickup', label: 'Listo para retirar' },
  { id: 'picked_up', label: 'Retirado' },
];

/** `/admin/ventas` - panel sobre las órdenes reales (ver `OrdersAdminService`). */
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
  protected readonly deliveryMethodOptions = DELIVERY_METHOD_OPTIONS;
  protected readonly logisticsStatusOptions = LOGISTICS_STATUS_OPTIONS;
  protected readonly orderStatusLabel = orderStatusLabel;
  protected readonly paymentStatusLabel = paymentStatusLabel;
  protected readonly deliveryMethodLabel = deliveryMethodLabel;
  protected readonly logisticsStatusLabel = logisticsStatusLabel;

  protected readonly status = signal<OrderStatus | 'todos'>('todos');
  protected readonly paymentStatus = signal<PaymentStatus | 'todos'>('todos');
  protected readonly deliveryMethod = signal<DeliveryMethod | 'todos'>('todos');
  protected readonly logisticsStatus = signal<LogisticsStatus | 'todos'>('todos');
  protected readonly search = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly minAmount = signal('');
  protected readonly maxAmount = signal('');
  protected readonly paymentMethodType = signal<'credit_card' | 'debit_card' | 'todos'>('todos');
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
      this.deliveryMethod();
      this.logisticsStatus();
      this.debouncedSearch.value();
      this.dateFrom();
      this.dateTo();
      this.minAmount();
      this.maxAmount();
      this.paymentMethodType();
      untracked(() => this.offset.set(0));
    });

    effect(() => {
      const status = this.status();
      const paymentStatus = this.paymentStatus();
      const deliveryMethod = this.deliveryMethod();
      const logisticsStatus = this.logisticsStatus();
      const search = this.debouncedSearch.value();
      const dateFrom = this.dateFrom();
      const dateTo = this.dateTo();
      const minAmount = this.minAmount();
      const maxAmount = this.maxAmount();
      const paymentMethodType = this.paymentMethodType();
      const offset = this.offset();
      untracked(
        () =>
          void this.load(
            status,
            paymentStatus,
            deliveryMethod,
            logisticsStatus,
            search,
            dateFrom,
            dateTo,
            minAmount,
            maxAmount,
            paymentMethodType,
            offset,
          ),
      );
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

  protected onDeliveryMethodChange(event: Event): void {
    this.deliveryMethod.set((event.target as HTMLSelectElement).value as DeliveryMethod | 'todos');
  }

  protected onLogisticsStatusChange(event: Event): void {
    this.logisticsStatus.set((event.target as HTMLSelectElement).value as LogisticsStatus | 'todos');
  }

  protected onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
  }

  protected onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
  }

  protected onMinAmountChange(event: Event): void {
    this.minAmount.set((event.target as HTMLInputElement).value);
  }

  protected onMaxAmountChange(event: Event): void {
    this.maxAmount.set((event.target as HTMLInputElement).value);
  }

  protected onPaymentMethodTypeChange(event: Event): void {
    this.paymentMethodType.set(
      (event.target as HTMLSelectElement).value as 'credit_card' | 'debit_card' | 'todos',
    );
  }

  protected clearFilters(): void {
    this.status.set('todos');
    this.paymentStatus.set('todos');
    this.deliveryMethod.set('todos');
    this.logisticsStatus.set('todos');
    this.search.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.minAmount.set('');
    this.maxAmount.set('');
    this.paymentMethodType.set('todos');
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
    deliveryMethod: DeliveryMethod | 'todos',
    logisticsStatus: LogisticsStatus | 'todos',
    search: string,
    dateFrom: string,
    dateTo: string,
    minAmount: string,
    maxAmount: string,
    paymentMethodType: 'credit_card' | 'debit_card' | 'todos',
    offset: number,
  ): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const page = await this.ordersAdminService.list({
        status: status === 'todos' ? undefined : status,
        paymentStatus: paymentStatus === 'todos' ? undefined : paymentStatus,
        deliveryMethod: deliveryMethod === 'todos' ? undefined : deliveryMethod,
        logisticsStatus: logisticsStatus === 'todos' ? undefined : logisticsStatus,
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        minAmount: minAmount.trim() ? Number(minAmount) : undefined,
        maxAmount: maxAmount.trim() ? Number(maxAmount) : undefined,
        paymentMethodType: paymentMethodType === 'todos' ? undefined : paymentMethodType,
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
