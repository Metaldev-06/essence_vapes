export type Role = 'admin' | 'regular';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly phone: string | null;
  /** ISO 8601 ("YYYY-MM-DD"). */
  readonly birthDate: string | null;
  readonly role: Role;
  readonly isActive: boolean;
  readonly emailVerified: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UpdateProfileData {
  readonly fullName?: string;
  readonly phone?: string | null;
  readonly birthDate?: string | null;
}

export interface SecurityStatus {
  readonly emailVerified: boolean;
  readonly emailVerifiedAt: string | null;
  readonly passwordChangedAt: string | null;
  readonly createdAt: string;
}

export type EmailVerificationOutcome = 'ok' | 'already_verified' | 'expired' | 'invalid';
export type SecurityCodeErrorOutcome = 'invalid' | 'expired' | 'too_many_attempts';

export interface AuthSession {
  readonly user: AuthUser;
  readonly token: string;
}

export interface LoginCredentials {
  readonly email: string;
  readonly password: string;
}

export interface RegisterData {
  readonly email: string;
  readonly password: string;
  readonly fullName: string;
}

export interface AuthResult {
  readonly success: boolean;
  readonly message?: string;
}

/** `ok` = nada que mostrar. `expiring-soon` = faltan pocos minutos para que el JWT venza -
 *  se ofrece renovar sin volver a loguearse. `expired` = ya venció (o un request devolvió 401) -
 *  la sesión ya se cerró del lado del cliente y hay que re-loguearse. */
export type SessionState = 'ok' | 'expiring-soon' | 'expired';
