import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../core/config/api.config';
import { AdminAuthService } from './admin-auth.service';

const TOKEN_STORAGE_KEY = 'essence-vapes-admin-token';

describe('AdminAuthService', () => {
  afterEach(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  });

  it('volver a iniciar sesión después de que venció baja el aviso "Tu sesión venció"', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(AdminAuthService);
    const httpMock = TestBed.inject(HttpTestingController);

    service.handleSessionExpired();
    expect(service.sessionState()).toBe('expired');

    const pending = service.login({ email: 'admin@test.com', password: 'secreta123' });
    httpMock.expectOne(`${API_BASE_URL}/auth/login`).flush({
      token: 'new-admin-token',
      user: {
        id: 'a1',
        email: 'admin@test.com',
        fullName: 'Administrador',
        role: 'admin',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await expect(pending).resolves.toEqual({ success: true });
    expect(service.sessionState()).toBe('ok');
    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('new-admin-token');
    httpMock.verify();
  });
});
