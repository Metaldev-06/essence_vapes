import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../config/api.config';
import { decodeJwtExpiryMs } from './jwt-expiry.helper';
import type {
  AuthResult,
  AuthSession,
  AuthUser,
  EmailVerificationOutcome,
  LoginCredentials,
  RegisterData,
  SecurityStatus,
  SessionState,
  UpdateProfileData,
} from './auth.model';

/** Cuánto antes del vencimiento se avisa (ver tarea del usuario, 2026-11-13) - el JWT dura 2hs
 *  (`JWT_EXPIRES_IN` en el backend), 5 minutos de margen alcanzan para que el usuario reaccione
 *  sin ser un aviso tan temprano que se sienta molesto. */
const SESSION_WARNING_LEAD_MS = 5 * 60_000;

export type EmailVerificationConfirmResult =
  | { success: true; outcome: EmailVerificationOutcome }
  | { success: false; message: string };

export type PasswordCodeVerifyResult =
  | { success: true; authorization: string }
  | { success: false; message: string };

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
  private readonly sessionStateSignal = signal<SessionState>('ok');
  private readonly renewingSignal = signal(false);
  private warningTimer: ReturnType<typeof setTimeout> | undefined;
  private expiryTimer: ReturnType<typeof setTimeout> | undefined;

  /** Current JWT. Read by the auth interceptor; templates should use `user`/`isAuthenticated`. */
  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  /** True while a stored session is being validated against the API on startup. */
  readonly isRestoring = this.restoringSignal.asReadonly();
  /** Maneja el aviso "tu sesión está por vencer"/"tu sesión venció" - ver `SessionExpiryModal`. */
  readonly sessionState = this.sessionStateSignal.asReadonly();
  readonly renewing = this.renewingSignal.asReadonly();

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

  /** Cierre explícito, elegido por la persona (botón "Cerrar sesión", cambio de contraseña,
   *  etc.) - a diferencia de `handleSessionExpired`, no deja nada para mostrar. */
  logout(): void {
    this.clearExpiryTimers();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.sessionStateSignal.set('ok');
    this.clearStoredToken();
  }

  /** Sesión terminada SIN que la persona lo haya pedido (venció, o un request devolvió 401 -
   *  ver el interceptor) - deja `sessionState` en `'expired'` para que `SessionExpiryModal` lo
   *  muestre y redirija a login, en vez de desaparecer en silencio. Idempotente. */
  handleSessionExpired(): void {
    this.clearExpiryTimers();
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.sessionStateSignal.set('expired');
    this.clearStoredToken();
  }

  /** Pide un JWT nuevo sin pedir credenciales de nuevo - ver tarea del usuario, 2026-11-13.
   *  `GET /auth/check-status` ya firma y devuelve una sesión fresca para el usuario autenticado
   *  (reutilizado tal cual, no hizo falta un endpoint de refresh nuevo). */
  async renewSession(): Promise<boolean> {
    this.renewingSignal.set(true);
    try {
      const session = await firstValueFrom(
        this.http.get<AuthSession>(`${this.baseUrl}/check-status`),
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

  /** Programa el aviso previo y el cierre automático al vencer, en base al `exp` del propio
   *  JWT - nunca espera a que un request falle para enterarse. */
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

  // -------------------------------------------------------------------------------------
  // Verificación de email
  // -------------------------------------------------------------------------------------

  async resendEmailVerification(): Promise<AuthResult> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/email-verification/resend`, {}));
      return { success: true };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  /** No requiere sesión - el token del link ya identifica la cuenta por sí solo. */
  async confirmEmailVerification(token: string): Promise<EmailVerificationConfirmResult> {
    try {
      const result = await firstValueFrom(
        this.http.post<{ outcome: EmailVerificationOutcome }>(
          `${this.baseUrl}/email-verification/confirm`,
          { token },
        ),
      );
      // Un token recién confirmado puede pertenecer al usuario ya logueado (p.ej. verificó
      // desde otra pestaña) - refrescar su estado para que el banner desaparezca sin recargar.
      if (result.outcome === 'ok' && this.isAuthenticated()) void this.refreshCurrentUser();
      return { success: true, outcome: result.outcome };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  // -------------------------------------------------------------------------------------
  // Olvidé mi contraseña (no autenticado)
  // -------------------------------------------------------------------------------------

  /** El backend siempre responde 200 con el mismo mensaje genérico - nunca revela si el
   *  email existe. Solo falla por red/servidor, nunca por "ese correo no está registrado". */
  async forgotPassword(email: string): Promise<AuthResult> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/password/forgot`, { email }));
      return { success: true };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  async verifyPasswordResetCode(email: string, code: string): Promise<PasswordCodeVerifyResult> {
    try {
      const result = await firstValueFrom(
        this.http.post<{ resetAuthorization: string }>(`${this.baseUrl}/password/verify-code`, {
          email,
          code,
        }),
      );
      return { success: true, authorization: result.resetAuthorization };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  async resetPassword(resetAuthorization: string, newPassword: string): Promise<AuthResult> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/password/reset`, { resetAuthorization, newPassword }),
      );
      // La contraseña nueva invalida toda sesión existente (incluida esta, si había alguna) -
      // ver `sessionVersion` en el backend. Siempre se redirige a login después de esto.
      this.logout();
      return { success: true };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  // -------------------------------------------------------------------------------------
  // Cambiar contraseña (autenticado) - distinto de "olvidé mi contraseña"
  // -------------------------------------------------------------------------------------

  async requestPasswordChange(): Promise<AuthResult> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/password/change/request`, {}));
      return { success: true };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  async verifyPasswordChangeCode(code: string): Promise<PasswordCodeVerifyResult> {
    try {
      const result = await firstValueFrom(
        this.http.post<{ changeAuthorization: string }>(
          `${this.baseUrl}/password/change/verify`,
          { code },
        ),
      );
      return { success: true, authorization: result.changeAuthorization };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  async confirmPasswordChange(
    changeAuthorization: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResult> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/password/change/confirm`, {
          changeAuthorization,
          currentPassword,
          newPassword,
        }),
      );
      // Mismo motivo que `resetPassword`: la sesión actual también queda invalidada.
      this.logout();
      return { success: true };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  // -------------------------------------------------------------------------------------
  // Perfil / cuenta
  // -------------------------------------------------------------------------------------

  async updateProfile(data: UpdateProfileData): Promise<AuthResult> {
    try {
      const user = await firstValueFrom(this.http.patch<AuthUser>(`${this.baseUrl}/me`, data));
      this.userSignal.set(user);
      return { success: true };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  /** El backend invalida el JWT actual también - siempre seguido de `logout()` local. */
  async revokeAllSessions(): Promise<AuthResult> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/sessions/revoke-all`, {}));
      this.logout();
      return { success: true };
    } catch (error) {
      return { success: false, message: this.extractErrorMessage(error) };
    }
  }

  async getSecurityStatus(): Promise<SecurityStatus | null> {
    try {
      return await firstValueFrom(this.http.get<SecurityStatus>(`${this.baseUrl}/me/security`));
    } catch {
      return null;
    }
  }

  private async refreshCurrentUser(): Promise<void> {
    try {
      const user = await firstValueFrom(this.http.get<AuthUser>(`${this.baseUrl}/me`));
      this.userSignal.set(user);
    } catch {
      /* Si falla, el estado anterior se mantiene - no es crítico para este caso. */
    }
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
    this.scheduleExpiryWatch(session.token);
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
        this.scheduleExpiryWatch(this.tokenSignal()!);
      }
    } catch {
      // Un 401 ya pasó por el interceptor (que dejó `sessionState` en 'expired') - no pisarlo
      // acá con un `logout()` silencioso. Cualquier otra falla (red caída, etc.) sí limpia todo.
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
