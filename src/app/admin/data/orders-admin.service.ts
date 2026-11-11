import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';
import { IS_ADMIN_REQUEST } from '../../core/auth/admin-request.context';
import type {
  DeliveryMethod,
  LogisticsStatus,
  Order,
  OrderStatus,
  PaginatedOrders,
  PaymentStatus,
} from '../../core/orders/order.model';

const ADMIN_CONTEXT = new HttpContext().set(IS_ADMIN_REQUEST, true);

export interface OrdersAdminQuery {
  limit?: number;
  offset?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryMethod?: DeliveryMethod;
  logisticsStatus?: LogisticsStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface OrdersStats {
  confirmedOrdersCount: number;
  confirmedRevenueValue: number;
  pendingOrdersCount: number;
  rejectedPaymentsCount: number;
  totalOrdersCount: number;
  pendingPreparationCount: number;
  pendingShipmentCount: number;
  readyForPickupCount: number;
  deliveredCount: number;
  refundedOrdersCount: number;
  refundedAmountValue: number;
}

export interface PaymentAttemptRecord {
  id: string;
  orderId: string;
  idempotencyKey: string;
  mpOrderId: string | null;
  mpPaymentId: string | null;
  paymentMethodType: string | null;
  paymentMethodId: string | null;
  status: PaymentStatus;
  statusDetail: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderAuditLogRecord {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  orderId: string;
  detail: string | null;
  createdAt: string;
}

/** Panel admin "Ventas/Pedidos" - lectura + acciones logísticas (ver tarea: reembolsos manuales
 *  siguen sin implementarse, hasta verificar permisos/procedimientos oficiales de Mercado Pago). */
@Injectable({ providedIn: 'root' })
export class OrdersAdminService {
  private readonly http = inject(HttpClient);
  private readonly ordersBaseUrl = `${API_BASE_URL}/orders`;
  private readonly paymentsBaseUrl = `${API_BASE_URL}/payments`;

  list(query: OrdersAdminQuery): Promise<PaginatedOrders> {
    const params: Record<string, string | number> = {
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    };
    if (query.status) params['status'] = query.status;
    if (query.paymentStatus) params['paymentStatus'] = query.paymentStatus;
    if (query.deliveryMethod) params['deliveryMethod'] = query.deliveryMethod;
    if (query.logisticsStatus) params['logisticsStatus'] = query.logisticsStatus;
    if (query.search) params['search'] = query.search;
    if (query.dateFrom) params['dateFrom'] = query.dateFrom;
    if (query.dateTo) params['dateTo'] = query.dateTo;

    return firstValueFrom(
      this.http.get<PaginatedOrders>(`${this.ordersBaseUrl}/admin`, { params, context: ADMIN_CONTEXT }),
    );
  }

  getStats(): Promise<OrdersStats> {
    return firstValueFrom(
      this.http.get<OrdersStats>(`${this.ordersBaseUrl}/admin/stats`, { context: ADMIN_CONTEXT }),
    );
  }

  getOne(id: string): Promise<Order> {
    return firstValueFrom(
      this.http.get<Order>(`${this.ordersBaseUrl}/admin/${id}`, { context: ADMIN_CONTEXT }),
    );
  }

  getPaymentAttempts(orderId: string): Promise<PaymentAttemptRecord[]> {
    return firstValueFrom(
      this.http.get<PaymentAttemptRecord[]>(
        `${this.paymentsBaseUrl}/admin/orders/${orderId}/attempts`,
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  updateLogisticsStatus(orderId: string, logisticsStatus: LogisticsStatus): Promise<Order> {
    return firstValueFrom(
      this.http.patch<Order>(
        `${this.ordersBaseUrl}/admin/${orderId}/logistics-status`,
        { logisticsStatus },
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  getAuditLog(orderId: string): Promise<OrderAuditLogRecord[]> {
    return firstValueFrom(
      this.http.get<OrderAuditLogRecord[]>(
        `${this.ordersBaseUrl}/admin/${orderId}/audit-log`,
        { context: ADMIN_CONTEXT },
      ),
    );
  }
}
