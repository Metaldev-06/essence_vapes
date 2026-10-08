import { HttpErrorResponse } from '@angular/common/http';

/** Same extraction logic as AuthService/CartService - shared here so every admin page reads backend errors consistently. */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: string | string[] } | null;
    if (Array.isArray(body?.message)) return body.message[0] ?? 'Ocurrió un error inesperado';
    if (typeof body?.message === 'string') return body.message;
    if (error.status === 0) return 'No pudimos conectar con el servidor. Probá de nuevo.';
  }
  return 'Ocurrió un error inesperado. Probá de nuevo.';
}
