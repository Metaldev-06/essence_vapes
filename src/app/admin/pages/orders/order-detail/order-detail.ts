import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { LogisticsStatus, Order } from '../../../../core/orders/order.model';
import {
  ALLOWED_LOGISTICS_STATUSES,
  logisticsStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
} from '../../../../core/orders/order-status-labels';
import { extractErrorMessage } from '../../../data/extract-error-message';
import {
  OrdersAdminService,
  type OrderAuditLogRecord,
  type PaymentAttemptRecord,
} from '../../../data/orders-admin.service';
import { buildWhatsAppActions, type WhatsAppAction } from '../../../data/whatsapp.helper';

/** `/admin/ventas/:id` - detalle + acción manual de estado logístico (ver tarea: reembolsos
 *  siguen sin implementarse, hasta verificar permisos/procedimientos oficiales de Mercado Pago). */
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
  protected readonly auditLog = signal<readonly OrderAuditLogRecord[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly orderStatusLabel = orderStatusLabel;
  protected readonly paymentStatusLabel = paymentStatusLabel;
  protected readonly logisticsStatusLabel = logisticsStatusLabel;

  protected readonly allowedLogisticsStatuses = computed<readonly LogisticsStatus[]>(() => {
    const order = this.order();
    return order ? ALLOWED_LOGISTICS_STATUSES[order.deliveryMethod] : [];
  });

  protected readonly whatsAppActions = computed<readonly WhatsAppAction[]>(() => {
    const order = this.order();
    return order ? buildWhatsAppActions(order) : [];
  });

  protected readonly selectedLogisticsStatus = signal<LogisticsStatus | null>(null);
  protected readonly logisticsStatusDirty = computed(
    () => this.selectedLogisticsStatus() !== (this.order()?.logisticsStatus ?? null),
  );
  protected readonly savingLogisticsStatus = signal(false);
  protected readonly logisticsError = signal<string | null>(null);

  private orderId: string | null = null;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.orderId = id;
    if (id) void this.load(id);
    else this.isLoading.set(false);
  }

  protected onLogisticsStatusChange(event: Event): void {
    this.selectedLogisticsStatus.set((event.target as HTMLSelectElement).value as LogisticsStatus);
  }

  protected async saveLogisticsStatus(): Promise<void> {
    const id = this.orderId;
    const next = this.selectedLogisticsStatus();
    if (!id || !next) return;

    this.savingLogisticsStatus.set(true);
    this.logisticsError.set(null);
    try {
      const [updated, auditLog] = await Promise.all([
        this.ordersAdminService.updateLogisticsStatus(id, next),
        this.ordersAdminService.getAuditLog(id),
      ]);
      this.order.set(updated);
      this.auditLog.set(auditLog);
    } catch (error) {
      this.logisticsError.set(extractErrorMessage(error));
    } finally {
      this.savingLogisticsStatus.set(false);
    }
  }

  private async load(id: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const [order, attempts, auditLog] = await Promise.all([
        this.ordersAdminService.getOne(id),
        this.ordersAdminService.getPaymentAttempts(id),
        this.ordersAdminService.getAuditLog(id),
      ]);
      this.order.set(order);
      this.attempts.set(attempts);
      this.auditLog.set(auditLog);
      this.selectedLogisticsStatus.set(order.logisticsStatus);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}
