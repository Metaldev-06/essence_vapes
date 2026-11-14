import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AdminAuthService } from './admin-auth.service';
import type { AdminNotification, NotificationsPage } from './notifications-admin.model';
import { NotificationsAdminService } from './notifications-admin.service';
import { NotificationsStore, mergeNotifications } from './notifications.store';

function makeNotification(id: string, overrides: Partial<AdminNotification> = {}): AdminNotification {
  return {
    id,
    type: 'order.paid',
    category: 'orders',
    priority: 'high',
    title: `Pedido ${id}`,
    body: 'Se acreditó el pago',
    resourceUrl: '/admin/pedidos/1',
    resourceType: 'order',
    resourceId: '1',
    read: false,
    archived: false,
    createdAt: '2026-06-15T12:00:00.000Z',
    ...overrides,
  };
}

function makePage(data: AdminNotification[], unreadCount: number): NotificationsPage {
  return {
    data,
    pagination: { total: data.length, pages: 1, current: 1, limit: 20, offset: 0 },
    unreadCount,
  };
}

describe('mergeNotifications', () => {
  const older = makeNotification('a', { createdAt: '2026-06-15T10:00:00.000Z' });
  const newer = makeNotification('b', { createdAt: '2026-06-15T11:00:00.000Z' });

  it('ordena de la más nueva a la más vieja', () => {
    expect(mergeNotifications([older], [newer], 20).map((n) => n.id)).toEqual(['b', 'a']);
  });

  it('no duplica una notificación que llega dos veces', () => {
    const merged = mergeNotifications([older, newer], [newer, newer], 20);

    expect(merged.map((n) => n.id)).toEqual(['b', 'a']);
  });

  it('lo que llega pisa el estado que ya había', () => {
    const merged = mergeNotifications([older], [{ ...older, read: true }], 20);

    expect(merged).toHaveLength(1);
    expect(merged[0].read).toBe(true);
  });

  it('saca las archivadas', () => {
    const merged = mergeNotifications([older, newer], [{ ...newer, archived: true }], 20);

    expect(merged.map((n) => n.id)).toEqual(['a']);
  });

  it('recorta al límite quedándose con las más nuevas', () => {
    const many = Array.from({ length: 5 }, (_, index) =>
      makeNotification(`n${index}`, { createdAt: `2026-06-15T1${index}:00:00.000Z` }),
    );

    expect(mergeNotifications([], many, 2).map((n) => n.id)).toEqual(['n4', 'n3']);
  });

  it('desempata por id cuando dos tienen la misma fecha, de forma estable', () => {
    const first = makeNotification('x1');
    const second = makeNotification('x2');

    expect(mergeNotifications([first], [second], 20).map((n) => n.id)).toEqual(['x2', 'x1']);
    expect(mergeNotifications([second], [first], 20).map((n) => n.id)).toEqual(['x2', 'x1']);
  });

  it('no modifica las listas que recibe', () => {
    const current = [older];
    mergeNotifications(current, [newer], 20);

    expect(current).toEqual([older]);
  });
});

type ReadResult = { done: boolean; value?: Uint8Array };

/** Stream SSE falso: el test decide cuándo "llega" cada evento, sin red ni timers. */
function createFakeStream() {
  const encoder = new TextEncoder();
  const queued: ReadResult[] = [];
  const waiting: ((result: ReadResult) => void)[] = [];

  const push = (result: ReadResult): void => {
    const resolve = waiting.shift();
    if (resolve) resolve(result);
    else queued.push(result);
  };

  return {
    response: {
      status: 200,
      ok: true,
      body: {
        getReader: () => ({
          read: () =>
            new Promise<ReadResult>((resolve) => {
              const next = queued.shift();
              if (next) resolve(next);
              else waiting.push(resolve);
            }),
        }),
      },
    },
    send: (event: object) => push({ done: false, value: encoder.encode(`data: ${JSON.stringify(event)}\n\n`) }),
  };
}

describe('NotificationsStore', () => {
  const token = signal<string | null>('token-1');
  const isAuthenticated = signal(true);
  const api = {
    baseUrl: 'http://api.test/notifications',
    list: vi.fn(),
    setRead: vi.fn(),
    setArchived: vi.fn(),
    markAllRead: vi.fn(),
    bulk: vi.fn(),
  };
  let streams: ReturnType<typeof createFakeStream>[];
  let fetchMock: ReturnType<typeof vi.fn>;

  const first = makeNotification('a', { createdAt: '2026-06-15T10:00:00.000Z' });
  const second = makeNotification('b', { createdAt: '2026-06-15T11:00:00.000Z' });
  const third = makeNotification('c', { createdAt: '2026-06-15T12:00:00.000Z' });

  function createStore(): NotificationsStore {
    const store = TestBed.inject(NotificationsStore);
    TestBed.flushEffects();
    return store;
  }

  /** Abre el store y espera a que termine la carga inicial que dispara el evento `ready`. */
  async function createLiveStore(): Promise<NotificationsStore> {
    const store = createStore();
    streams[0].send({ type: 'ready' });
    await vi.waitFor(() => expect(store.connection()).toBe('live'));
    await vi.waitFor(() => expect(api.list).toHaveBeenCalled());
    await vi.waitFor(() => expect(store.recent().length).toBeGreaterThan(0));
    return store;
  }

  beforeEach(() => {
    token.set('token-1');
    isAuthenticated.set(true);
    vi.resetAllMocks();
    api.list.mockResolvedValue(makePage([second, first], 5));

    streams = [];
    fetchMock = vi.fn(() => {
      const stream = createFakeStream();
      streams.push(stream);
      return Promise.resolve(stream.response);
    });
    vi.stubGlobal('fetch', fetchMock);

    TestBed.configureTestingModule({
      providers: [
        { provide: AdminAuthService, useValue: { token, isAuthenticated } },
        { provide: NotificationsAdminService, useValue: api },
      ],
    });
  });

  afterEach(() => {
    // Cerrar sesión hace que el store aborte el stream y limpie sus timers.
    token.set(null);
    isAuthenticated.set(false);
    TestBed.flushEffects();
    vi.unstubAllGlobals();
  });

  it('abre el stream con el token del admin', () => {
    const store = createStore();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/notifications/stream');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token-1' });
    expect(store.connection()).toBe('connecting');
  });

  it('al conectar carga las recientes y toma el contador del servidor', async () => {
    const store = await createLiveStore();

    expect(store.recent().map((n) => n.id)).toEqual(['b', 'a']);
    expect(store.unreadCount()).toBe(5);
    expect(store.hasUnread()).toBe(true);
  });

  it('una notificación en vivo se agrega arriba y actualiza el contador', async () => {
    const store = await createLiveStore();
    const revision = store.revision();

    streams[0].send({ type: 'notification.created', notification: third, unreadCount: 6 });
    await vi.waitFor(() => expect(store.unreadCount()).toBe(6));

    expect(store.recent().map((n) => n.id)).toEqual(['c', 'b', 'a']);
    expect(store.latest()?.id).toBe('c');
    expect(store.revision()).toBeGreaterThan(revision);
  });

  it('un evento repetido no duplica la notificación ni desfasa el contador', async () => {
    const store = await createLiveStore();
    const event = { type: 'notification.created', notification: third, unreadCount: 6 };

    streams[0].send(event);
    streams[0].send(event);
    streams[0].send({ type: 'ping' });
    await vi.waitFor(() => expect(store.recent()).toHaveLength(3));

    expect(store.recent().map((n) => n.id)).toEqual(['c', 'b', 'a']);
    expect(store.unreadCount()).toBe(6);
  });

  it('un cambio hecho en otra pestaña recarga el estado y el contador', async () => {
    const store = await createLiveStore();
    api.list.mockResolvedValue(makePage([{ ...second, read: true }, { ...first, read: true }], 0));

    streams[0].send({ type: 'notifications.changed', unreadCount: 0 });
    await vi.waitFor(() => expect(store.recent().every((n) => n.read)).toBe(true));

    expect(store.unreadCount()).toBe(0);
    expect(store.hasUnread()).toBe(false);
  });

  it('al renovarse el token reabre el stream y se pone al día', async () => {
    const store = await createLiveStore();
    const revision = store.revision();
    // Mientras no estaba conectado llegó una nueva y otra quedó leída desde otro dispositivo.
    api.list.mockResolvedValue(makePage([third, { ...second, read: true }, first], 2));

    token.set('token-2');
    TestBed.flushEffects();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token-2' });

    streams[1].send({ type: 'ready' });
    await vi.waitFor(() => expect(store.recent()).toHaveLength(3));

    expect(store.recent().map((n) => n.id)).toEqual(['c', 'b', 'a']);
    expect(store.recent()[1].read).toBe(true);
    expect(store.unreadCount()).toBe(2);
    expect(store.revision()).toBeGreaterThan(revision);
  });

  it('marcar todo como leído se ve al instante y confirma con el servidor', async () => {
    const store = await createLiveStore();
    api.markAllRead.mockResolvedValue({ updated: 2, unreadCount: 0 });
    api.list.mockResolvedValue(makePage([], 0));

    const pending = store.markAllRead();
    expect(store.unreadCount()).toBe(0);
    expect(store.recent().every((n) => n.read)).toBe(true);

    await pending;
    expect(api.markAllRead).toHaveBeenCalledTimes(1);
    expect(store.unreadCount()).toBe(0);
  });

  it('si marcar como leída falla, el contador vuelve al valor real del servidor', async () => {
    const store = await createLiveStore();
    api.setRead.mockRejectedValue(new Error('sin red'));

    await expect(store.markRead('b')).rejects.toThrow('sin red');

    expect(store.unreadCount()).toBe(5);
  });

  it('con una respuesta 401 no reintenta', async () => {
    fetchMock.mockImplementation(() => Promise.resolve({ status: 401, ok: false, body: null }));
    const store = createStore();

    await vi.waitFor(() => expect(store.connection()).toBe('idle'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('al cerrar sesión se vacía y deja de escuchar', async () => {
    const store = await createLiveStore();

    token.set(null);
    isAuthenticated.set(false);
    TestBed.flushEffects();

    expect(store.recent()).toEqual([]);
    expect(store.unreadCount()).toBe(0);
    expect(store.connection()).toBe('idle');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal?.aborted).toBe(true);
  });
});
