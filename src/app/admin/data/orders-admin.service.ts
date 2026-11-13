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
import type { DateRangeSelection } from '../shared/date-range/date-range.model';

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
  minAmount?: number;
  maxAmount?: number;
  paymentMethodType?: 'credit_card' | 'debit_card';
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

/** Ver `OrderReconciliationReport` (backend) - verificación de solo lectura, a pedido, nunca
 *  corrige nada sola. */
export interface OrderReconciliationReport {
  checked: boolean;
  reason?: string;
  checkedAt: string;
  mpOrderId?: string;
  internalPaymentStatus?: PaymentStatus;
  mpPaymentStatus?: PaymentStatus;
  internalAmountValue?: number;
  mpAmountValue?: number;
  matches?: boolean;
  discrepancies: string[];
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

/** Ver `OrdersService.getSalesSummary` (backend) para la definición exacta de cada campo -
 *  `ordersCount`/`grossOrdersValue`/etc filtran por fecha de CREACIÓN del pedido, mientras que
 *  `paidOrdersCount`/`approvedPaymentsValue`/`unitsSoldCount` filtran por fecha de APROBACIÓN del
 *  pago (`paidAt`) - son fechas distintas a propósito, nunca inventadas. */
export interface SalesSummary {
  ordersCount: number;
  grossOrdersValue: number;
  pendingOrdersCount: number;
  cancelledOrdersCount: number;
  paidOrdersCount: number;
  approvedPaymentsValue: number;
  averageTicketValue: number;
  unitsSoldCount: number;
  refundedOrdersCount: number;
  refundedAmountValue: number;
}

export interface SalesSummaryComparison {
  current: SalesSummary;
  previous: SalesSummary;
}

export type SalesTimeseriesGranularity = 'day' | 'week' | 'month';

export interface SalesTimeseriesPoint {
  bucketStartUtc: string;
  ordersCount: number;
  grossValue: number;
  approvedValue: number;
  unitsSold: number;
}

export interface SalesByCategoryPoint {
  category: string;
  unitsSold: number;
  revenueValue: number;
  sharePercent: number;
}

export interface TopProductPoint {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string | null;
  category: string | null;
  unitsSold: number;
  revenueValue: number;
  sharePercent: number;
  currentStock: number | null;
  imageUrl: string | null;
  brand: string | null;
  /** `null` mientras no se cargó el costo de este producto/variante (ver tarea, punto 4.3) -
   *  calculado con el costo ACTUAL, no un snapshot histórico de cuando se vendió. */
  marginValue: number | null;
  marginPercent: number | null;
}

export type TopProductsSortBy = 'revenue' | 'units';
export type TopProductsDirection = 'top' | 'bottom';

/** Mismo filtro opcional en los 4 endpoints de ventas (ver `SalesReportFiltersDto` del backend) -
 *  todos opcionales: el dashboard los deja sin usar y obtiene el mismo resultado de siempre. */
export interface SalesReportFilters {
  category?: string;
  brand?: string;
  productId?: string;
  variantId?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryMethod?: DeliveryMethod;
  paymentMethodType?: 'credit_card' | 'debit_card';
  buyer?: string;
}

const filterParams = (filters: SalesReportFilters): Record<string, string> => {
  const params: Record<string, string> = {};
  if (filters.category) params['category'] = filters.category;
  if (filters.brand) params['brand'] = filters.brand;
  if (filters.productId) params['productId'] = filters.productId;
  if (filters.variantId) params['variantId'] = filters.variantId;
  if (filters.orderStatus) params['orderStatus'] = filters.orderStatus;
  if (filters.paymentStatus) params['paymentStatus'] = filters.paymentStatus;
  if (filters.deliveryMethod) params['deliveryMethod'] = filters.deliveryMethod;
  if (filters.paymentMethodType) params['paymentMethodType'] = filters.paymentMethodType;
  if (filters.buyer) params['buyer'] = filters.buyer;
  return params;
};

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
    if (query.minAmount != null) params['minAmount'] = query.minAmount;
    if (query.maxAmount != null) params['maxAmount'] = query.maxAmount;
    if (query.paymentMethodType) params['paymentMethodType'] = query.paymentMethodType;

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

  updateInternalNotes(orderId: string, notes: string): Promise<Order> {
    return firstValueFrom(
      this.http.patch<Order>(
        `${this.ordersBaseUrl}/admin/${orderId}/notes`,
        { notes },
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  /** Conciliación bajo demanda (ver tarea, punto 8.4) - vuelve a consultar Mercado Pago en el
   *  momento, no hay nada cacheado de esto. */
  reconcileOrder(orderId: string): Promise<OrderReconciliationReport> {
    return firstValueFrom(
      this.http.get<OrderReconciliationReport>(
        `${this.paymentsBaseUrl}/admin/orders/${orderId}/reconcile`,
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  getSalesSummary(
    range: DateRangeSelection,
    filters: SalesReportFilters = {},
  ): Promise<SalesSummaryComparison> {
    const params = {
      from: range.fromUtc,
      to: range.toUtc,
      previousFrom: range.previousFromUtc,
      previousTo: range.previousToUtc,
      ...filterParams(filters),
    };
    return firstValueFrom(
      this.http.get<SalesSummaryComparison>(`${this.ordersBaseUrl}/admin/sales-summary`, {
        params,
        context: ADMIN_CONTEXT,
      }),
    );
  }

  getSalesTimeseries(
    range: DateRangeSelection,
    granularity: SalesTimeseriesGranularity,
    filters: SalesReportFilters = {},
  ): Promise<SalesTimeseriesPoint[]> {
    const params = { from: range.fromUtc, to: range.toUtc, granularity, ...filterParams(filters) };
    return firstValueFrom(
      this.http.get<SalesTimeseriesPoint[]>(`${this.ordersBaseUrl}/admin/sales-timeseries`, {
        params,
        context: ADMIN_CONTEXT,
      }),
    );
  }

  getSalesByCategory(
    range: DateRangeSelection,
    filters: SalesReportFilters = {},
  ): Promise<SalesByCategoryPoint[]> {
    const params = { from: range.fromUtc, to: range.toUtc, ...filterParams(filters) };
    return firstValueFrom(
      this.http.get<SalesByCategoryPoint[]>(`${this.ordersBaseUrl}/admin/sales-by-category`, {
        params,
        context: ADMIN_CONTEXT,
      }),
    );
  }

  getTopProducts(
    range: DateRangeSelection,
    limit: number,
    sortBy: TopProductsSortBy,
    direction: TopProductsDirection = 'top',
    filters: SalesReportFilters = {},
  ): Promise<TopProductPoint[]> {
    const params = {
      from: range.fromUtc,
      to: range.toUtc,
      limit,
      sortBy,
      direction,
      ...filterParams(filters),
    };
    return firstValueFrom(
      this.http.get<TopProductPoint[]>(`${this.ordersBaseUrl}/admin/top-products`, {
        params,
        context: ADMIN_CONTEXT,
      }),
    );
  }

  /** Excel/PDF (ver tarea, punto 4.4) - mismos filtros que `getTopProducts`, el archivo lo arma
   *  el backend (no hay forma de generar un .xlsx/.pdf real solo del lado del cliente). */
  exportTopProducts(
    range: DateRangeSelection,
    sortBy: TopProductsSortBy,
    direction: TopProductsDirection,
    filters: SalesReportFilters,
    format: 'xlsx' | 'pdf',
  ): Promise<Blob> {
    const params = {
      from: range.fromUtc,
      to: range.toUtc,
      limit: 50,
      sortBy,
      direction,
      format,
      ...filterParams(filters),
    };
    return firstValueFrom(
      this.http.get(`${this.ordersBaseUrl}/admin/top-products/export`, {
        params,
        context: ADMIN_CONTEXT,
        responseType: 'blob',
      }),
    );
  }
}
