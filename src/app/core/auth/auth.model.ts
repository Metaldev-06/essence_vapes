export type Role = 'admin' | 'regular';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: Role;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

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
