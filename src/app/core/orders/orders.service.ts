import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type { CreateOrderResult, Order, PaginatedOrders, RemovedCartLine } from './order.model';

export type OrderActionResult =
  | { success: true; order: Order; removedFromCart: RemovedCartLine[] }
  | { success: false; message: string };

/**
 * Órdenes del comprador - a diferencia de `CartService`/`FavoritesService`, no mantiene una
 * lista cacheada en memoria: el historial de compras se pide a demanda (mismo criterio que
 * `WithdrawalRequestsAdminService`), ya que no cambia constantemente ni necesita estar
 * disponible en toda la app. `currentOrder` sí es un signal - lo usa el wizard de checkout
 * (`/checkout`) para pasar la orden recién creada entre sus pasos sin volver a pedirla.
 */
@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/orders`;

  private readonly currentOrderSignal = signal<Order | null>(null);
  readonly currentOrder = this.currentOrderSignal.asReadonly();

  setCurrentOrder(order: Order | null): void {
    this.currentOrderSignal.set(order);
  }

  async createFromCart(addressId: string, acceptTerms: boolean): Promise<OrderActionResult> {
    try {
      const result = await firstValueFrom(
        this.http.post<CreateOrderResult>(this.baseUrl, { addressId, acceptTerms }),
      );
      this.currentOrderSignal.set(result.order);
      return { success: true, order: result.order, removedFromCart: result.removedFromCart };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  async refreshCurrentOrder(): Promise<Order | null> {
    const order = this.currentOrderSignal();
    if (!order) return null;
    try {
      const fresh = await firstValueFrom(this.http.get<Order>(`${this.baseUrl}/mine/${order.id}`));
      this.currentOrderSignal.set(fresh);
      return fresh;
    } catch {
      return order;
    }
  }

  async myOrders(limit = 10, offset = 0): Promise<PaginatedOrders | null> {
    try {
      return await firstValueFrom(
        this.http.get<PaginatedOrders>(this.baseUrl + '/mine', { params: { limit, offset } }),
      );
    } catch {
      return null;
    }
  }

  async myOrder(id: string): Promise<Order | null> {
    try {
      return await firstValueFrom(this.http.get<Order>(`${this.baseUrl}/mine/${id}`));
    } catch {
      return null;
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
