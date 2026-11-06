import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';
import { IS_ADMIN_REQUEST } from '../../core/auth/admin-request.context';

const ADMIN_CONTEXT = new HttpContext().set(IS_ADMIN_REQUEST, true);

export type WithdrawalStatus = 'recibido' | 'en_revision' | 'confirmado' | 'rechazado';

export interface WithdrawalRequestRecord {
  readonly id: string;
  readonly trackingCode: string;
  readonly buyerName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly orderReference: string | null;
  readonly productDescription: string;
  readonly comments: string | null;
  readonly status: WithdrawalStatus;
  readonly adminNotes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly resolvedAt: string | null;
}

export interface WithdrawalRequestsPagination {
  readonly total: number;
  readonly pages: number;
  readonly current: number;
  readonly limit: number;
  readonly offset: number;
}

export interface WithdrawalRequestsPage {
  readonly data: readonly WithdrawalRequestRecord[];
  readonly pagination: WithdrawalRequestsPagination;
}

export interface WithdrawalRequestsQuery {
  readonly limit?: number;
  readonly offset?: number;
  readonly status?: WithdrawalStatus;
}

/** Panel admin: seguimiento interno del "botón de arrepentimiento" (Disposición 954/2025). */
@Injectable({ providedIn: 'root' })
export class WithdrawalRequestsAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/withdrawal-requests`;

  list(query: WithdrawalRequestsQuery): Promise<WithdrawalRequestsPage> {
    const params: Record<string, string | number> = {
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    };
    if (query.status) params['status'] = query.status;

    return firstValueFrom(
      this.http.get<WithdrawalRequestsPage>(this.baseUrl, { params, context: ADMIN_CONTEXT }),
    );
  }

  updateStatus(
    id: string,
    status: WithdrawalStatus,
    adminNotes?: string,
  ): Promise<WithdrawalRequestRecord> {
    return firstValueFrom(
      this.http.patch<WithdrawalRequestRecord>(
        `${this.baseUrl}/${id}/status`,
        { status, adminNotes },
        { context: ADMIN_CONTEXT },
      ),
    );
  }
}
