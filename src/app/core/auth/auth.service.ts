import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import type {
  AuthResult,
  AuthSession,
  AuthUser,
  LoginCredentials,
  RegisterData,
} from './auth.model';

const TOKEN_STORAGE_KEY = 'essence-vapes-token';

/**
 * Storefront authentication only. This service never admits a session for an
 * `admin` user - the admin panel has its own, separate auth flow.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Exact text the backend sends for a genuinely wrong email/password (see the backend's
  // HashPassword helper and login flow). Reused client-side so the admin-rejection path below
  // reads identically - no wording difference a user could use to tell the two cases apart.
  private static readonly INVALID_CREDENTIALS_MESSAGE = 'Las credenciales no son válidas';

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/auth`;

  private readonly tokenSignal = signal<string | null>(this.readStoredToken());
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly restoringSignal = signal(this.tokenSignal() !== null);

  /** Current JWT. Read by the auth interceptor; templates should use `user`/`isAuthenticated`. */
  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  /** True while a stored session is being validated against the API on startup. */
  readonly isRestoring = this.restoringSignal.asReadonly();

  constructor() {
    if (this.tokenSignal()) {
      // Deferred: the auth interceptor injects AuthService on every request it handles,
      // including this one. Calling restoreSession() synchronously here would make that
      // injection land while this very constructor is still on the stack, which Angular
      // reports as NG0200 (circular dependency) - silently caught below as a failed
      // restore, which then wipes an otherwise valid token. Queuing it as a microtask
      // lets the constructor return and this instance finish registering first.
      queueMicrotask(() => void this.restoreSession());
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const session = await firstValueFrom(
        this.http.post<AuthSession>(`${this.baseUrl}/login`, credentials),
      );
      return this.admitCustomerSession(session);
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  async register(data: RegisterData): Promise<AuthResult> {
    try {
      const session = await firstValueFrom(
        this.http.post<AuthSession>(`${this.baseUrl}/register`, data),
      );
      return this.admitCustomerSession(session);
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.clearStoredToken();
  }

  /**
   * Accepts a freshly issued session, but only for non-admin users. The rejection message is
   * deliberately identical to the backend's own "wrong credentials" text (see `login`'s catch
   * block) - a user must never be able to tell "wrong password" apart from "this is actually an
   * admin account".
   */
  private admitCustomerSession(session: AuthSession): AuthResult {
    if (session.user.role !== 'regular') {
      return { success: false, message: AuthService.INVALID_CREDENTIALS_MESSAGE };
    }

    this.tokenSignal.set(session.token);
    this.userSignal.set(session.user);
    this.storeToken(session.token);
    return { success: true };
  }

  private async restoreSession(): Promise<void> {
    try {
      const user = await firstValueFrom(this.http.get<AuthUser>(`${this.baseUrl}/me`));
      if (user.role !== 'regular') {
        // A stored admin token should never drive a storefront session.
        this.logout();
      } else {
        this.userSignal.set(user);
      }
    } catch {
      this.logout();
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
