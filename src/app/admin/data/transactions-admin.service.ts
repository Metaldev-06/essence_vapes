import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { IS_ADMIN_REQUEST } from '../../core/auth/admin-request.context';
import { API_BASE_URL } from '../../core/config/api.config';
import type { PaymentStatus } from '../../core/orders/order.model';

const ADMIN_CONTEXT = new HttpContext().set(IS_ADMIN_REQUEST, true);

export type TransactionPaymentMethodType = 'credit_card' | 'debit_card';

export interface TransactionRecord {
  id: string;
  orderId: string;
  mpOrderId: string | null;
  mpPaymentId: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  amountValue: number | null;
  amount: string | null;
  currency: string;
  status: PaymentStatus;
  statusDetail: string | null;
  paymentMethodType: TransactionPaymentMethodType | null;
  paymentMethodId: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTransactions {
  data: TransactionRecord[];
  pagination: { total: number; pages: number; current: number; limit: number; offset: number };
}

export interface TransactionsAdminQuery {
  limit?: number;
  offset?: number;
  status?: PaymentStatus;
  paymentMethodType?: TransactionPaymentMethodType;
  orderId?: string;
  buyer?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Panel admin "Transacciones" (ver tarea, punto 6) - sección independiente de "Pedidos": todos
 * los intentos de pago registrados por el sistema, con filtros y paginación desde el backend.
 */
@Injectable({ providedIn: 'root' })
export class TransactionsAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/payments`;

  list(query: TransactionsAdminQuery): Promise<PaginatedTransactions> {
    const params: Record<string, string | number> = {
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    };
    if (query.status) params['status'] = query.status;
    if (query.paymentMethodType) params['paymentMethodType'] = query.paymentMethodType;
    if (query.orderId) params['orderId'] = query.orderId;
    if (query.buyer) params['buyer'] = query.buyer;
    if (query.dateFrom) params['dateFrom'] = query.dateFrom;
    if (query.dateTo) params['dateTo'] = query.dateTo;

    return firstValueFrom(
      this.http.get<PaginatedTransactions>(`${this.baseUrl}/admin/transactions`, {
        params,
        context: ADMIN_CONTEXT,
      }),
    );
  }
}
