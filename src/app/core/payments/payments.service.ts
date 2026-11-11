import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { MercadoPagoSdkService } from './mercadopago-sdk.service';
import type {
  ProcessPaymentInput,
  ProcessPaymentResponse,
  ProcessPaymentResult,
} from './payment.model';

/**
 * Habla con `POST /payments` - el backend es quien crea el pago real contra Mercado Pago y
 * recalcula/confirma todo (nunca confía en lo que este servicio le manda más allá del
 * `formData` ya tokenizado por el Payment Brick). Nunca ve ni toca el Access Token.
 */
@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly mercadoPagoSdk = inject(MercadoPagoSdkService);
  private readonly baseUrl = `${API_BASE_URL}/payments`;

  async processPayment(input: ProcessPaymentInput): Promise<ProcessPaymentResult> {
    const deviceId = this.mercadoPagoSdk.getDeviceId();
    const headers = deviceId ? { 'X-meli-session-id': deviceId } : undefined;

    try {
      const response = await firstValueFrom(
        this.http.post<ProcessPaymentResponse>(this.baseUrl, input, { headers }),
      );
      return { success: true, response };
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
    }
    return 'Ocurrió un error inesperado. Probá de nuevo.';
  }
}
