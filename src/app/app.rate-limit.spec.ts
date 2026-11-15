import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { RateLimitService } from './core/http/rate-limit.service';

/** Mientras dura una espera por límite de solicitudes, el sitio no se puede usar. */
describe('App - espera por límite de solicitudes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    localStorage.removeItem('ev:rate-limit');
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem('ev:rate-limit');
    document.documentElement.style.overflow = '';
    document.documentElement.style.paddingRight = '';
  });

  it('todo el sitio queda inerte y sin scroll, y vuelve a la normalidad al terminar', async () => {
    const fixture = TestBed.createComponent(App);
    const element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    const content = element.querySelector('.app-content')!;
    expect(content.hasAttribute('inert')).toBe(false);

    TestBed.inject(RateLimitService).block(10_000);
    await fixture.whenStable();

    expect(content.hasAttribute('inert')).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
    // El aviso queda afuera de la parte inerte: sigue siendo usable.
    expect(element.querySelector('[role="alertdialog"]')?.closest('[inert]')).toBeNull();

    vi.advanceTimersByTime(10_000);
    await fixture.whenStable();

    expect(content.hasAttribute('inert')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
  });
});
