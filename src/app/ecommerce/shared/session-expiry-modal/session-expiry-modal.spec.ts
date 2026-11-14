import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { SessionExpiryModal } from './session-expiry-modal';

describe('SessionExpiryModal (tienda)', () => {
  it('"Ir a iniciar sesión" baja el aviso: el login de la tienda queda debajo de este cartel', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(AuthService);
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
    expect(navigate).toHaveBeenCalledWith('/auth/login');
  });
});
