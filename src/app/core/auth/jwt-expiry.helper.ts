/**
 * Lee el claim `exp` de un JWT sin validarlo - la validación real (firma, `sessionVersion`,
 * cuenta activa) la hace siempre el backend en cada request (ver `JwtStrategy.validate`). Esto
 * es solo para saber, del lado del cliente, cuándo avisarle al usuario que su sesión está por
 * vencer. Devuelve `null` si el token no es legible (nunca lanza).
 */
export const decodeJwtExpiryMs = (token: string): number | null => {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const json = JSON.parse(atob(base64)) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
};
