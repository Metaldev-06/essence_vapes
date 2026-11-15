import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { type Observable, Subject, of, take } from 'rxjs';

const STORAGE_KEY = 'ev:rate-limit';
/** Si el servidor no informa cuánto esperar (no debería pasar), se espera esto. */
export const DEFAULT_RATE_LIMIT_WAIT_MS = 60_000;
/** Tope de seguridad ante un valor absurdo. */
const MAX_WAIT_MS = 60 * 60_000;
/** Cada cuánto se actualiza la cuenta. Menos de un segundo para que el número cambie justo
 *  cuando pasa cada segundo real, sin "atrasarse" hasta uno entero. */
const TICK_MS = 250;

interface RateLimitBlock {
  /** Momento (epoch ms) en que el servidor vuelve a aceptar solicitudes. */
  readonly until: number;
  /** Cuándo empezó la espera - solo para la barra de progreso. */
  readonly startedAt: number;
}

/**
 * Pausa por límite de solicitudes (HTTP 429). Guarda el MOMENTO en que se libera, no un
 * contador: así la cuenta es real aunque se recargue la página (se persiste en `localStorage`)
 * y se ve igual en todas las pestañas abiertas.
 *
 * `rateLimitInterceptor` la activa con el tiempo que informa el servidor y retiene los pedidos
 * hasta que termina; `RateLimitModal` la muestra.
 */
@Injectable({ providedIn: 'root' })
export class RateLimitService {
  private readonly blockSignal = signal<RateLimitBlock | null>(null);
  private readonly nowSignal = signal(Date.now());
  private readonly released = new Subject<void>();
  private ticker: ReturnType<typeof setInterval> | undefined;

  readonly isBlocked = computed(() => this.blockSignal() !== null);

  /** Segundos que faltan, redondeados hacia arriba (muestra "1" hasta el último instante). */
  readonly remainingSeconds = computed(() => {
    const block = this.blockSignal();
    return block ? Math.max(0, Math.ceil((block.until - this.nowSignal()) / 1000)) : 0;
  });

  /** 0 → recién empieza, 1 → terminó. */
  readonly progress = computed(() => {
    const block = this.blockSignal();
    if (!block) return 0;
    const total = block.until - block.startedAt;
    return total > 0 ? Math.min(1, Math.max(0, (this.nowSignal() - block.startedAt) / total)) : 1;
  });

  constructor() {
    // Una espera que quedó de antes de recargar la página sigue donde estaba.
    this.resume(readPersisted());

    if (typeof window !== 'undefined') {
      // Otra pestaña alcanzó el límite: esta también espera (el límite es del visitante, no de
      // la pestaña).
      const onStorage = (event: StorageEvent) => {
        if (event.key === STORAGE_KEY) this.resume(readPersisted());
      };
      window.addEventListener('storage', onStorage);
      inject(DestroyRef).onDestroy(() => {
        window.removeEventListener('storage', onStorage);
        clearInterval(this.ticker);
      });
    }
  }

  /** El servidor respondió 429: no se le envía nada más hasta dentro de `waitMs`. */
  block(waitMs: number): void {
    const now = Date.now();
    const wait = Math.min(Math.max(waitMs, 1000), MAX_WAIT_MS);
    const current = this.blockSignal();
    const block: RateLimitBlock = {
      until: Math.max(current?.until ?? 0, now + wait),
      startedAt: current?.startedAt ?? now,
    };
    persist(block);
    this.start(block);
  }

  /** Emite (una vez) cuando se puede volver a enviar: al instante si no hay espera. */
  whenAvailable(): Observable<void> {
    return this.blockSignal() ? this.released.pipe(take(1)) : of(undefined);
  }

  private resume(block: RateLimitBlock | null): void {
    if (block && block.until > Date.now()) this.start(block);
    else if (!this.blockSignal()) clearPersisted();
  }

  private start(block: RateLimitBlock): void {
    this.blockSignal.set(block);
    this.nowSignal.set(Date.now());
    this.ticker ??= setInterval(() => this.tick(), TICK_MS);
  }

  private tick(): void {
    const now = Date.now();
    this.nowSignal.set(now);
    const block = this.blockSignal();
    if (block && now < block.until) return;

    clearInterval(this.ticker);
    this.ticker = undefined;
    this.blockSignal.set(null);
    clearPersisted();
    this.released.next();
  }
}

function readPersisted(): RateLimitBlock | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RateLimitBlock>;
    return typeof parsed.until === 'number' && typeof parsed.startedAt === 'number'
      ? { until: parsed.until, startedAt: parsed.startedAt }
      : null;
  } catch {
    return null;
  }
}

function persist(block: RateLimitBlock): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(block));
  } catch {
    /* Sin storage (modo privado, etc.): la cuenta sigue funcionando, solo no sobrevive a recargar. */
  }
}

function clearPersisted(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Ídem. */
  }
}
