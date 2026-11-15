import { TestBed } from '@angular/core/testing';

import { RateLimitService } from '../rate-limit.service';
import { RateLimitModal, formatCountdown } from './rate-limit-modal';

describe('formatCountdown', () => {
  it('muestra minutos y segundos con dos cifras', () => {
    expect(formatCountdown(42)).toBe('0:42');
    expect(formatCountdown(65)).toBe('1:05');
    expect(formatCountdown(600)).toBe('10:00');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-3)).toBe('0:00');
  });
});

describe('RateLimitModal', () => {
  beforeEach(() => {
    // Solo el reloj y el intervalo del contador: el `setTimeout` con el que Angular programa el
    // refresco de pantalla tiene que seguir siendo real, si no `whenStable()` nunca termina.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    localStorage.removeItem('ev:rate-limit');
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem('ev:rate-limit');
  });

  it('aparece con la cuenta regresiva y se cierra solo al llegar a 0', async () => {
    const fixture = TestBed.createComponent(RateLimitModal);
    const element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    expect(element.querySelector('[role="alertdialog"]')).toBeNull();

    TestBed.inject(RateLimitService).block(65_000);
    await fixture.whenStable();

    expect(element.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(element.querySelector('.rate-limit-countdown')?.textContent?.trim()).toBe('1:05');

    vi.advanceTimersByTime(30_000);
    await fixture.whenStable();
    expect(element.querySelector('.rate-limit-countdown')?.textContent?.trim()).toBe('0:35');

    vi.advanceTimersByTime(35_000);
    await fixture.whenStable();
    expect(element.querySelector('[role="alertdialog"]')).toBeNull();
  });
});
