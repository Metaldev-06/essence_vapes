import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api.config';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const TOKEN_STORAGE_KEY = 'essence-vapes-token';

describe('AuthService', () => {
  afterEach(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  });

  it('restores a stored session on startup without wiping a valid token', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'stored-token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    const service = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);

    expect(service.isRestoring()).toBe(true);
    expect(service.token()).toBe('stored-token');

    // restoreSession() is queued as a microtask (see AuthService's constructor); let it run.
    await Promise.resolve();
    await Promise.resolve();

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/me`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer stored-token');
    req.flush({
      id: 'u1',
      email: 'cliente@test.com',
      fullName: 'Cliente Test',
      role: 'regular',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(service.isRestoring()).toBe(false);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('stored-token');
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('stored-token');

    httpMock.verify();
  });

  it('logs out and drops the token if the restored session belongs to an admin', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'admin-token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    const service = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);

    await Promise.resolve();
    await Promise.resolve();

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/me`);
    req.flush({
      id: 'admin1',
      email: 'admin@test.com',
      fullName: 'Admin',
      role: 'admin',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(service.isRestoring()).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();

    httpMock.verify();
  });

  it('rejects an admin login with the exact same message as wrong credentials', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    const service = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);

    const adminLogin = service.login({ email: 'admin@test.com', password: 'whatever' });
    const adminReq = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
    adminReq.flush({
      user: {
        id: 'admin1',
        email: 'admin@test.com',
        fullName: 'Admin',
        role: 'admin',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      token: 'admin-token',
    });
    const adminResult = await adminLogin;

    const wrongPasswordLogin = service.login({ email: 'cliente@test.com', password: 'nope' });
    const wrongPasswordReq = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
    wrongPasswordReq.flush(
      { message: 'Las credenciales no son válidas', error: 'Unauthorized', statusCode: 401 },
      { status: 401, statusText: 'Unauthorized' },
    );
    const wrongPasswordResult = await wrongPasswordLogin;

    expect(adminResult.success).toBe(false);
    expect(wrongPasswordResult.success).toBe(false);
    // The whole point: no wording difference a user could use to infer the account is an admin.
    expect(adminResult.message).toBe(wrongPasswordResult.message);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();

    httpMock.verify();
  });
});
