import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AdminAuthService } from '../../data/admin-auth.service';
import { SessionExpiryModal } from './session-expiry-modal';

describe('SessionExpiryModal (admin)', () => {
  it('"Ir a iniciar sesión" baja el aviso antes de ir al login', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(AdminAuthService);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    auth.handleSessionExpired();

    const fixture = TestBed.createComponent(SessionExpiryModal);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-primary');
    expect(button.textContent).toContain('Ir a iniciar sesión');

    button.click();
    await fixture.whenStable();

    expect(auth.sessionState()).toBe('ok');
    expect(fixture.nativeElement.querySelector('.session-modal')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/admin/login');
  });
});
