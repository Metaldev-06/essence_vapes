import { decodeJwtExpiryMs } from './jwt-expiry.helper';

const fakeJwt = (payload: Record<string, unknown>): string => {
  const base64url = (value: string) =>
    btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.fake-signature`;
};

describe('decodeJwtExpiryMs', () => {
  it('reads the exp claim (seconds) and returns it in milliseconds', () => {
    const expSeconds = Math.floor(Date.now() / 1000) + 3600;
    const token = fakeJwt({ id: 'u1', exp: expSeconds });
    expect(decodeJwtExpiryMs(token)).toBe(expSeconds * 1000);
  });

  it('returns null for a malformed token', () => {
    expect(decodeJwtExpiryMs('not-a-jwt')).toBeNull();
    expect(decodeJwtExpiryMs('')).toBeNull();
  });

  it('returns null when the payload has no exp claim', () => {
    expect(decodeJwtExpiryMs(fakeJwt({ id: 'u1' }))).toBeNull();
  });
});
