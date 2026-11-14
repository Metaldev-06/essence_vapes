import { TestBed } from '@angular/core/testing';

import { NotificationsAdminService } from './notifications-admin.service';
import {
  PushNotificationsService,
  describePushError,
  hasSameApplicationServerKey,
  urlBase64ToUint8Array,
} from './push-notifications.service';

// Clave pública real de producción (pública por definición: viaja a todos los navegadores).
const PUBLIC_KEY = 'BAAeyGWF7qje8oKhVbKWvrPAgkvvZLxdNe0-dkvUg-3ZbMAySyO8kBMgZdIBHcGsmPekb-gLzv0MlnhD5xvaLRg';
const KEY_BYTES = urlBase64ToUint8Array(PUBLIC_KEY);
const OTHER_KEY_BYTES = KEY_BYTES.map((byte, index) => (index === 10 ? byte ^ 0xff : byte));

function domError(name: string): Error {
  const error = new Error(`Registration failed - ${name}`);
  error.name = name;
  return error;
}

function fakeSubscription(key: Uint8Array | null, endpoint = 'https://fcm.googleapis.com/fcm/send/abc') {
  return {
    endpoint,
    options: { userVisibleOnly: true, applicationServerKey: key ? key.slice().buffer : null },
    toJSON: () => ({ endpoint, keys: { p256dh: 'p'.repeat(40), auth: 'a'.repeat(16) } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  };
}

describe('urlBase64ToUint8Array', () => {
  it('decodifica una clave VAPID a un punto P-256 sin comprimir', () => {
    expect(KEY_BYTES).toHaveLength(65);
    expect(KEY_BYTES[0]).toBe(0x04);
  });
});

describe('hasSameApplicationServerKey', () => {
  it('reconoce la misma clave', () => {
    expect(hasSameApplicationServerKey(fakeSubscription(KEY_BYTES) as unknown as PushSubscription, KEY_BYTES)).toBe(
      true,
    );
  });

  it('detecta una suscripción hecha con otra clave', () => {
    const subscription = fakeSubscription(OTHER_KEY_BYTES) as unknown as PushSubscription;
    expect(hasSameApplicationServerKey(subscription, KEY_BYTES)).toBe(false);
  });

  it('una suscripción sin clave no sirve para VAPID', () => {
    expect(hasSameApplicationServerKey(fakeSubscription(null) as unknown as PushSubscription, KEY_BYTES)).toBe(false);
  });

  it('si el navegador no informa la clave, conserva la suscripción', () => {
    const subscription = { endpoint: 'https://x' } as unknown as PushSubscription;
    expect(hasSameApplicationServerKey(subscription, KEY_BYTES)).toBe(true);
  });
});

describe('describePushError', () => {
  it('en Brave explica cómo prender el servicio de push', () => {
    expect(describePushError(domError('AbortError'), true)).toContain('brave://settings/privacy');
  });

  it('un AbortError en otro navegador apunta a la conexión con el servicio de push', () => {
    const message = describePushError(domError('AbortError'), false);
    expect(message).toContain('VPN');
    expect(message).not.toContain('brave');
  });

  it('un NotAllowedError apunta a los permisos del sitio y del sistema', () => {
    expect(describePushError(domError('NotAllowedError'))).toContain('sistema operativo');
  });

  it('un error desconocido muestra su nombre para poder diagnosticarlo', () => {
    expect(describePushError(domError('InvalidAccessError'))).toContain('(InvalidAccessError)');
  });

  it('algo que no es un error da un mensaje sin detalle', () => {
    expect(describePushError('boom')).toBe(
      'El navegador no pudo activar las notificaciones push. Probá de nuevo o usá otro navegador.',
    );
  });
});

describe('PushNotificationsService.enable', () => {
  const api = {
    getPushPublicKey: vi.fn(),
    registerPushDevice: vi.fn(),
    removePushDevice: vi.fn(),
  };
  const requestPermission = vi.fn();
  const pushManager = { getSubscription: vi.fn(), subscribe: vi.fn() };
  const registration = { pushManager };
  const serviceWorker = {
    register: vi.fn(),
    ready: Promise.resolve(registration),
    getRegistration: vi.fn(),
  };

  function createService(): PushNotificationsService {
    TestBed.configureTestingModule({ providers: [{ provide: NotificationsAdminService, useValue: api }] });
    return TestBed.inject(PushNotificationsService);
  }

  beforeEach(() => {
    vi.resetAllMocks();
    api.getPushPublicKey.mockResolvedValue({ enabled: true, publicKey: PUBLIC_KEY });
    api.registerPushDevice.mockResolvedValue({ id: 'device-1' });
    requestPermission.mockResolvedValue('granted');
    serviceWorker.register.mockResolvedValue(registration);
    pushManager.getSubscription.mockResolvedValue(null);
    pushManager.subscribe.mockResolvedValue(fakeSubscription(KEY_BYTES));

    vi.stubGlobal('PushManager', class {});
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    delete (navigator as { brave?: unknown }).brave;
  });

  it('pide el permiso antes de cualquier consulta al servidor', async () => {
    const service = createService();

    await expect(service.enable()).resolves.toEqual({ ok: true });

    expect(requestPermission.mock.invocationCallOrder[0]).toBeLessThan(
      api.getPushPublicKey.mock.invocationCallOrder[0],
    );
    expect(pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: KEY_BYTES });
    expect(api.registerPushDevice).toHaveBeenCalledTimes(1);
  });

  it('con el permiso denegado no registra nada', async () => {
    requestPermission.mockResolvedValue('denied');
    const service = createService();

    const result = await service.enable();

    expect(result.ok).toBe(false);
    expect(serviceWorker.register).not.toHaveBeenCalled();
    expect(api.registerPushDevice).not.toHaveBeenCalled();
  });

  it('si el navegador rechaza la suscripción, devuelve la causa y la deja en la consola', async () => {
    const failure = domError('AbortError');
    pushManager.subscribe.mockRejectedValue(failure);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = createService();

    const result = await service.enable();

    expect(result).toEqual({ ok: false, reason: describePushError(failure, false) });
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('[push]'), failure);
    expect(api.registerPushDevice).not.toHaveBeenCalled();
  });

  it('en Brave el mensaje explica qué opción prender', async () => {
    Object.defineProperty(navigator, 'brave', { configurable: true, value: {} });
    pushManager.subscribe.mockRejectedValue(domError('AbortError'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = createService();

    const result = await service.enable();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain('brave://settings/privacy');
  });

  it('reutiliza la suscripción existente si es de la misma clave', async () => {
    const existing = fakeSubscription(KEY_BYTES);
    pushManager.getSubscription.mockResolvedValue(existing);
    const service = createService();

    await service.enable();

    expect(pushManager.subscribe).not.toHaveBeenCalled();
    expect(existing.unsubscribe).not.toHaveBeenCalled();
    expect(api.registerPushDevice).toHaveBeenCalledTimes(1);
  });

  it('reemplaza una suscripción hecha con otra clave VAPID', async () => {
    const stale = fakeSubscription(OTHER_KEY_BYTES, 'https://fcm.googleapis.com/fcm/send/vieja');
    pushManager.getSubscription.mockResolvedValue(stale);
    const service = createService();

    await service.enable();

    expect(stale.unsubscribe).toHaveBeenCalledTimes(1);
    expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(api.registerPushDevice).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc' }),
    );
  });

  it('un error del servidor al guardar el dispositivo sigue llegando a la pantalla', async () => {
    api.registerPushDevice.mockRejectedValue(new Error('400'));
    const service = createService();

    await expect(service.enable()).rejects.toThrow('400');
  });
});
