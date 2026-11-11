import { DatePipe } from '@angular/common';
import { Component, computed, debounced, effect, inject, signal, untracked } from '@angular/core';

import type { PaymentStatus } from '../../../core/orders/order.model';
import { paymentStatusLabel } from '../../../core/orders/order-status-labels';
import { extractErrorMessage } from '../../data/extract-error-message';
import {
  TransactionsAdminService,
  type TransactionPaymentMethodType,
  type TransactionRecord,
} from '../../data/transactions-admin.service';

const PAGE_SIZE = 20;

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

const PAYMENT_METHOD_OPTIONS: readonly { id: TransactionPaymentMethodType | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'credit_card', label: 'Tarjeta de crédito' },
  { id: 'debit_card', label: 'Tarjeta de débito' },
];

/**
 * `/admin/transacciones` - todos los intentos de pago registrados por el sistema (ver tarea,
 * punto 6), independiente de "Pedidos": un pedido puede tener varios intentos, nunca se
 * sobrescriben entre sí. Solo muestra operaciones del ecommerce, no todos los movimientos de la
 * cuenta de Mercado Pago (ver `PaymentsService.findAllForAdmin`).
 */
@Component({
  selector: 'app-admin-transactions',
  imports: [DatePipe],
  templateUrl: './transactions.html',
  styleUrl: './transactions.css',
})
export default class AdminTransactions {
  private readonly transactionsAdminService = inject(TransactionsAdminService);

  protected readonly paymentStatusOptions = PAYMENT_STATUS_OPTIONS;
  protected readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;
  protected readonly paymentStatusLabel = paymentStatusLabel;

  protected readonly status = signal<PaymentStatus | 'todos'>('todos');
  protected readonly paymentMethodType = signal<TransactionPaymentMethodType | 'todos'>('todos');
  protected readonly orderId = signal('');
  protected readonly buyer = signal('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly offset = signal(0);
  private readonly debouncedOrderId = debounced(this.orderId, 300);
  private readonly debouncedBuyer = debounced(this.buyer, 300);

  protected readonly items = signal<readonly TransactionRecord[]>([]);
  protected readonly total = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly page = computed(() => Math.floor(this.offset() / PAGE_SIZE) + 1);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly hasPrev = computed(() => this.offset() > 0);
  protected readonly hasNext = computed(() => this.offset() + PAGE_SIZE < this.total());

  constructor() {
    effect(() => {
      this.status();
      this.paymentMethodType();
      this.debouncedOrderId.value();
      this.debouncedBuyer.value();
      this.dateFrom();
      this.dateTo();
      untracked(() => this.offset.set(0));
    });

    effect(() => {
      const status = this.status();
      const paymentMethodType = this.paymentMethodType();
      const orderId = this.debouncedOrderId.value();
      const buyer = this.debouncedBuyer.value();
      const dateFrom = this.dateFrom();
      const dateTo = this.dateTo();
      const offset = this.offset();
      untracked(
        () => void this.load(status, paymentMethodType, orderId, buyer, dateFrom, dateTo, offset),
      );
    });
  }

  protected prevPage(): void {
    if (this.hasPrev()) this.offset.update((value) => Math.max(0, value - PAGE_SIZE));
  }

  protected nextPage(): void {
    if (this.hasNext()) this.offset.update((value) => value + PAGE_SIZE);
  }

  protected onStatusChange(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value as PaymentStatus | 'todos');
  }

  protected onPaymentMethodChange(event: Event): void {
    this.paymentMethodType.set(
      (event.target as HTMLSelectElement).value as TransactionPaymentMethodType | 'todos',
    );
  }

  protected onOrderIdInput(event: Event): void {
    this.orderId.set((event.target as HTMLInputElement).value);
  }

  protected onBuyerInput(event: Event): void {
    this.buyer.set((event.target as HTMLInputElement).value);
  }

  protected onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
  }

  protected onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.status.set('todos');
    this.paymentMethodType.set('todos');
    this.orderId.set('');
    this.buyer.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  protected paymentMethodLabel(type: TransactionPaymentMethodType | null): string {
    if (type === 'credit_card') return 'Tarjeta de crédito';
    if (type === 'debit_card') return 'Tarjeta de débito';
    return '—';
  }

  private async load(
    status: PaymentStatus | 'todos',
    paymentMethodType: TransactionPaymentMethodType | 'todos',
    orderId: string,
    buyer: string,
    dateFrom: string,
    dateTo: string,
    offset: number,
  ): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const page = await this.transactionsAdminService.list({
        status: status === 'todos' ? undefined : status,
        paymentMethodType: paymentMethodType === 'todos' ? undefined : paymentMethodType,
        orderId: orderId.trim() || undefined,
        buyer: buyer.trim() || undefined,
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
