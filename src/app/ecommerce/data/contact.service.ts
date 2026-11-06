import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';

export interface ContactMessageInput {
  readonly name: string;
  readonly email: string;
  readonly phone?: string;
  readonly reason: string;
  readonly message: string;
}

export type ContactResult = { success: true } | { success: false; message: string };

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/contact`;

  async send(input: ContactMessageInput): Promise<ContactResult> {
    try {
      await firstValueFrom(this.http.post<void>(this.baseUrl, input));
      return { success: true };
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
