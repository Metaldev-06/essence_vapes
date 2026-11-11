import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../auth/auth.service';
import type { Address, AddressInput } from './address.model';

export interface AddressResult {
  readonly success: boolean;
  readonly message?: string;
  /** Solo en `create`/`update` exitosos - evita que un caller tenga que adivinar cuál de
   *  `addresses()` es la que se acaba de crear/editar. */
  readonly address?: Address;
}

/**
 * Direcciones de envío del usuario - mismo patrón que `FavoritesService` (carga en login,
 * limpia en logout, actualiza localmente tras cada mutación en vez de refetchear todo).
 */
@Injectable({ providedIn: 'root' })
export class AddressesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${API_BASE_URL}/addresses`;

  private readonly addressesSignal = signal<Address[]>([]);
  private readonly loadingSignal = signal(false);

  /** Default primero (igual orden que devuelve el backend). */
  readonly addresses = this.addressesSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly defaultAddress = computed(() => this.addressesSignal().find((a) => a.isDefault) ?? null);

  constructor() {
    // Same guard as `FavoritesService`: Angular can re-run an effect more than once for the
    // same logical auth transition, so this tracks whether the CURRENT state was already
    // reacted to - otherwise every extra re-run while still logged in would re-fetch for nothing.
    let hasSeenAuthenticated = false;

    effect(() => {
      const authenticated = this.authService.isAuthenticated();
      if (authenticated && !hasSeenAuthenticated) {
        hasSeenAuthenticated = true;
        void this.refresh();
      } else if (!authenticated && hasSeenAuthenticated) {
        hasSeenAuthenticated = false;
        this.addressesSignal.set([]);
      }
    });
  }

  async refresh(): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const addresses = await firstValueFrom(this.http.get<Address[]>(this.baseUrl));
      this.addressesSignal.set(addresses);
    } catch {
      this.addressesSignal.set([]);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async create(input: AddressInput): Promise<AddressResult> {
    try {
      const address = await firstValueFrom(this.http.post<Address>(this.baseUrl, input));
      this.absorb(address);
      return { success: true, address };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  async update(id: string, input: AddressInput): Promise<AddressResult> {
    try {
      const address = await firstValueFrom(
        this.http.patch<Address>(`${this.baseUrl}/${id}`, input),
      );
      this.absorb(address);
      return { success: true, address };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  async remove(id: string): Promise<AddressResult> {
    try {
      await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
      await this.refresh();
      return { success: true };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  async setDefault(id: string): Promise<AddressResult> {
    try {
      await firstValueFrom(this.http.patch<Address>(`${this.baseUrl}/${id}`, { isDefault: true }));
      await this.refresh();
      return { success: true };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  /** Inserta/reemplaza una dirección y vuelve a ordenar (default primero, más reciente después)
   *  sin pedirle la lista completa al backend. */
  private absorb(address: Address): void {
    this.addressesSignal.update((items) => {
      const withoutCurrent = items.filter((item) => item.id !== address.id);
      const next = address.isDefault
        ? withoutCurrent.map((item) => ({ ...item, isDefault: false }))
        : withoutCurrent;
      return [address, ...next].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    });
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
