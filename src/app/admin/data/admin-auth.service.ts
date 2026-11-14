import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';
import { IS_ADMIN_REQUEST } from '../../core/auth/admin-request.context';
import { decodeJwtExpiryMs } from '../../core/auth/jwt-expiry.helper';
import type {
  AuthResult,
  AuthSession,
  AuthUser,
  LoginCredentials,
  SessionState,
} from '../../core/auth/auth.model';

const TOKEN_STORAGE_KEY = 'essence-vapes-admin-token';
const ADMIN_CONTEXT = new HttpContext().set(IS_ADMIN_REQUEST, true);
/** Mismo margen que la sesión de la tienda (`core/auth/auth.service.ts`) - ver tarea del
 *  usuario, 2026-11-13. */
const SESSION_WARNING_LEAD_MS = 5 * 60_000;

/**
 * The admin panel's own session - separate storage key and separate interceptor from the
 * storefront's `AuthService`, so a staff member can be logged in as a customer and as an admin
 * in the same browser without either session clobbering the other. Only ever admits `admin`
 * users - a regular customer's credentials are rejected with the same generic message as wrong
 * credentials, for the same reason the storefront login never reveals an account is an admin's.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private static readonly INVALID_CREDENTIALS_MESSAGE = 'Las credenciales no son válidas';

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/auth`;

  private readonly tokenSignal = signal<string | null>(this.readStoredToken());
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly restoringSignal = signal(this.tokenSignal() !== null);
  private readonly sessionStateSignal = signal<SessionState>('ok');
  private readonly renewingSignal = signal(false);
  private warningTimer: ReturnType<typeof setTimeout> | undefined;
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isRestoring = this.restoringSignal.asReadonly();
  /** Maneja el aviso "tu sesión está por vencer"/"tu sesión venció" - ver `SessionExpiryModal`. */
  readonly sessionState = this.sessionStateSignal.asReadonly();
  readonly renewing = this.renewingSignal.asReadonly();

  constructor() {
    if (this.tokenSignal()) {
      // Deferred for the same reason as the storefront AuthService: the interceptor this
      // request goes through injects AdminAuthService too, and doing this synchronously here
      // would land that injection while this very constructor is still on the stack (NG0200).
      queueMicrotask(() => void this.restoreSession());
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const session = await firstValueFrom(
        this.http.post<AuthSession>(`${this.baseUrl}/login`, credentials, {
          context: ADMIN_CONTEXT,
        }),
      );
      return this.admitAdminSession(session);
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  /** Cierre explícito, elegido por la persona - a diferencia de `handleSessionExpired`, no deja
   *  nada para mostrar. */
  logout(): void {
    this.clearExpiryTimers();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.sessionStateSignal.set('ok');
    this.clearStoredToken();
  }

  /** Sesión terminada SIN que la persona lo haya pedido (venció, o un request devolvió 401) -
   *  deja `sessionState` en `'expired'` para que `SessionExpiryModal` lo muestre y redirija a
   *  login, en vez de desaparecer en silencio. Idempotente. */
  handleSessionExpired(): void {
    this.clearExpiryTimers();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.sessionStateSignal.set('expired');
    this.clearStoredToken();
  }

  /** Pide un JWT nuevo sin pedir credenciales de nuevo - ver tarea del usuario, 2026-11-13.
   *  `GET /auth/check-status` ya firma y devuelve una sesión fresca para el usuario autenticado. */
  async renewSession(): Promise<boolean> {
    this.renewingSignal.set(true);
    try {
      const session = await firstValueFrom(
        this.http.get<AuthSession>(`${this.baseUrl}/check-status`, { context: ADMIN_CONTEXT }),
      );
      this.tokenSignal.set(session.token);
      this.userSignal.set(session.user);
      this.storeToken(session.token);
      this.sessionStateSignal.set('ok');
      this.scheduleExpiryWatch(session.token);
      return true;
    } catch {
      this.handleSessionExpired();
      return false;
    } finally {
      this.renewingSignal.set(false);
    }
  }

  private scheduleExpiryWatch(token: string): void {
    this.clearExpiryTimers();
    const expiryMs = decodeJwtExpiryMs(token);
    if (expiryMs === null) return;

    const msUntilExpiry = expiryMs - Date.now();
    if (msUntilExpiry <= 0) {
      this.handleSessionExpired();
      return;
    }

    const msUntilWarning = Math.max(0, msUntilExpiry - SESSION_WARNING_LEAD_MS);
    this.warningTimer = setTimeout(() => this.sessionStateSignal.set('expiring-soon'), msUntilWarning);
    this.expiryTimer = setTimeout(() => this.handleSessionExpired(), msUntilExpiry);
  }

  private clearExpiryTimers(): void {
    clearTimeout(this.warningTimer);
    clearTimeout(this.expiryTimer);
  }

  private admitAdminSession(session: AuthSession): AuthResult {
    if (session.user.role !== 'admin') {
      return { success: false, message: AdminAuthService.INVALID_CREDENTIALS_MESSAGE };
    }

    this.tokenSignal.set(session.token);
    this.userSignal.set(session.user);
    this.storeToken(session.token);
    this.scheduleExpiryWatch(session.token);
    return { success: true };
  }

  private async restoreSession(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${this.baseUrl}/me`, { context: ADMIN_CONTEXT }),
      );
      if (user.role !== 'admin') {
        this.logout();
      } else {
        this.userSignal.set(user);
        this.scheduleExpiryWatch(this.tokenSignal()!);
      }
    } catch {
      // Un 401 ya pasó por el interceptor (que dejó `sessionState` en 'expired') - no pisarlo
      // acá con un `logout()` silencioso.
      if (this.sessionStateSignal() !== 'expired') this.logout();
    } finally {
      this.restoringSignal.set(false);
    }
  }

  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private storeToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      /* Private browsing or storage disabled: session just won't persist across reloads. */
    }
  }

  private clearStoredToken(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      /* Nothing to clean up if storage is unavailable. */
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
