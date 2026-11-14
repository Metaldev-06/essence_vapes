import type { NotificationStreamEvent } from './notifications-admin.model';

/**
 * Parser incremental de Server-Sent Events. Los bytes llegan cortados en cualquier punto (un
 * evento puede venir partido en dos lecturas, o varios juntos en una), así que se acumula en un
 * buffer y solo se emiten los eventos completos - los delimitados por una línea en blanco.
 *
 * Función pura sobre su propio estado: sin `fetch`, sin timers. Eso la hace testeable sin red.
 */
export function createSseParser(): (chunk: string) => NotificationStreamEvent[] {
  let buffer = '';

  return (chunk: string): NotificationStreamEvent[] => {
    buffer += chunk.replace(/\r\n/g, '\n');
    const events: NotificationStreamEvent[] = [];

    for (;;) {
      const boundary = buffer.indexOf('\n\n');
      if (boundary === -1) break;
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (!data) continue;

      try {
        const parsed = JSON.parse(data) as NotificationStreamEvent;
        if (typeof parsed?.type === 'string') events.push(parsed);
      } catch {
        /* Bloque que no es JSON (comentario, keep-alive de un proxy) - se ignora. */
      }
    }
    return events;
  };
}

const BACKOFF_STEPS_MS = [1_000, 2_000, 5_000, 10_000, 20_000, 30_000];

/**
 * Espera antes del intento de reconexión número `attempt` (1 = primer reintento). Crece hasta un
 * tope de 30 s y suma hasta un 30 % de azar: si el backend se reinicia, las pestañas abiertas no
 * vuelven todas en el mismo milisegundo. Nunca hay polling: sin fallas, no hay reintentos.
 */
export function reconnectDelayMs(attempt: number, random: () => number = Math.random): number {
  const base = BACKOFF_STEPS_MS[Math.min(Math.max(attempt, 1), BACKOFF_STEPS_MS.length) - 1];
  return Math.round(base * (1 + random() * 0.3));
}
