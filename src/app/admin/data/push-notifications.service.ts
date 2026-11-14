import { Injectable, inject, signal } from '@angular/core';

import { NotificationsAdminService } from './notifications-admin.service';

const SERVICE_WORKER_URL = '/admin-sw.js';
const SERVICE_WORKER_SCOPE = '/admin/';

export type PushSupport =
  /** El navegador puede recibir push. */
  | 'supported'
  /** iPhone/iPad en una pestaña de Safari: Apple solo permite push si el sitio está instalado
   *  en la pantalla de inicio. */
  | 'needs-install'
  | 'unsupported';

export type PushEnableResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/** Clave VAPID pública (base64url) -> bytes, que es lo que pide `pushManager.subscribe`. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Mismo hash truncado que calcula el backend (`fingerprint`) - identifica "este dispositivo"
 *  en la lista sin que el endpoint real viaje de vuelta desde el servidor. */
export async function endpointFingerprint(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export function detectPushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (hasApis) return 'supported';

  const isAppleMobile =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    // iPadOS se presenta como Mac; lo delata la pantalla táctil.
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return isAppleMobile ? 'needs-install' : 'unsupported';
}

/**
 * Web Push del lado del navegador. Regla central: NADA de esto corre solo. El service worker se
 * registra y el permiso se pide únicamente dentro de `enable()`, que la pantalla de
 * configuración llama desde el clic explícito del administrador - nunca al entrar al panel.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly api = inject(NotificationsAdminService);

  readonly support = detectPushSupport();

  private readonly permissionSignal = signal<NotificationPermission>(
    this.support === 'supported' ? Notification.permission : 'default',
  );
  private readonly fingerprintSignal = signal<string | null>(null);

  /** `granted` | `denied` | `default` (todavía no se le preguntó). */
  readonly permission = this.permissionSignal.asReadonly();
  /** Huella de la suscripción de ESTE navegador, o `null` si no está suscripto. */
  readonly currentFingerprint = this.fingerprintSignal.asReadonly();

  /** Lee el estado actual SIN pedir permiso ni registrar nada nuevo. */
  async refresh(): Promise<void> {
    if (this.support !== 'supported') return;
    this.permissionSignal.set(Notification.permission);
    try {
      const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
      const subscription = await registration?.pushManager.getSubscription();
      this.fingerprintSignal.set(subscription ? await endpointFingerprint(subscription.endpoint) : null);
    } catch {
      this.fingerprintSignal.set(null);
    }
  }

  /** Debe llamarse desde un gesto del usuario (clic): ahí el navegador muestra su diálogo. */
  async enable(): Promise<PushEnableResult> {
    if (this.support === 'needs-install') {
      return {
        ok: false,
        reason:
          'En iPhone y iPad primero hay que instalar el panel: tocá Compartir y después "Agregar a inicio". Abrilo desde ese ícono y volvé a activar las notificaciones.',
      };
    }
    if (this.support !== 'supported') {
      return { ok: false, reason: 'Este navegador no admite notificaciones push.' };
    }

    const { enabled, publicKey } = await this.api.getPushPublicKey();
    if (!enabled || !publicKey) {
      return { ok: false, reason: 'Las notificaciones push todavía no están configuradas en el servidor.' };
    }

    const permission = await Notification.requestPermission();
    this.permissionSignal.set(permission);
    if (permission === 'denied') {
      return {
        ok: false,
        reason:
          'El navegador tiene bloqueadas las notificaciones de este sitio. Habilitalas desde el candado de la barra de direcciones y probá de nuevo.',
      };
    }
    if (permission !== 'granted') {
      return { ok: false, reason: 'No se otorgó el permiso para mostrar notificaciones.' };
    }

    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: SERVICE_WORKER_SCOPE,
    });
    await navigator.serviceWorker.ready.catch(() => undefined);

    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        // Exigido por los navegadores: todo push debe mostrar una notificación visible.
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    await this.api.registerPushDevice(subscription.toJSON());
    this.fingerprintSignal.set(await endpointFingerprint(subscription.endpoint));
    return { ok: true };
  }

  /** Da de baja ESTE navegador: en el servidor y en el propio navegador. */
  async disable(deviceId: string | null): Promise<void> {
    if (deviceId) await this.api.removePushDevice(deviceId).catch(() => undefined);
    if (this.support !== 'supported') return;
    try {
      const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
      const subscription = await registration?.pushManager.getSubscription();
      await subscription?.unsubscribe();
    } finally {
      this.fingerprintSignal.set(null);
    }
  }
}
