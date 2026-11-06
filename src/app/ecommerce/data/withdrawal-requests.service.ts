import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';

export interface CreateWithdrawalRequestInput {
  readonly buyerName: string;
  readonly email: string;
  readonly phone?: string;
  readonly orderReference?: string;
  readonly productDescription: string;
  readonly comments?: string;
}

export interface WithdrawalRequestCreated {
  readonly trackingCode: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface WithdrawalRequestStatus {
  readonly trackingCode: string;
  readonly status: string;
  readonly productDescription: string;
  readonly createdAt: string;
  readonly resolvedAt: string | null;
}

export type WithdrawalRequestResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

/** Botón de arrepentimiento (Disposición 954/2025) - funciona sin cuenta ni login. */
@Injectable({ providedIn: 'root' })
export class WithdrawalRequestsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/withdrawal-requests`;

  async create(
    input: CreateWithdrawalRequestInput,
  ): Promise<WithdrawalRequestResult<WithdrawalRequestCreated>> {
    try {
      const data = await firstValueFrom(
        this.http.post<WithdrawalRequestCreated>(this.baseUrl, input),
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  async lookup(
    trackingCode: string,
    email: string,
  ): Promise<WithdrawalRequestResult<WithdrawalRequestStatus>> {
    try {
      const data = await firstValueFrom(
        this.http.get<WithdrawalRequestStatus>(`${this.baseUrl}/lookup`, {
          params: { trackingCode, email },
        }),
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string | string[] } | null;
      if (Array.isArray(body?.message)) return body.message[0] ?? 'Ocurrió un error inesperado';
      if (typeof body?.message === 'string') return body.message;
      if (error.status === 0) return 'No pudimos conectar con el servidor. Probá de nuevo.';
      if (error.status === 429) return 'Demasiados intentos. Probá de nuevo en unos minutos.';
    }
    return 'Ocurrió un error inesperado. Probá de nuevo.';
  }
}
