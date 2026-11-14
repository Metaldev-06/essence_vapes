/*
 * Service worker del panel de administración de Essence Vapes.
 *
 * Hace UNA sola cosa: mostrar las notificaciones Web Push y abrir el panel al tocarlas. A
 * propósito NO intercepta `fetch` ni cachea nada: la tienda y el panel se sirven exactamente
 * igual que sin este archivo, así que no puede dejar a nadie viendo una versión vieja del sitio.
 *
 * Se registra con scope `/admin/` y solo cuando el administrador activa las notificaciones push
 * desde "Configuración de notificaciones" - nunca al entrar al panel.
 */

const PANEL_HOME = '/admin/notificaciones';

self.addEventListener('install', () => {
  // Sin caché que preparar: la versión nueva puede tomar el control enseguida.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/** Solo se aceptan rutas internas del panel: un payload manipulado no puede abrir otro sitio. */
function safePanelUrl(candidate) {
  return typeof candidate === 'string' && candidate.startsWith('/admin') && !candidate.startsWith('//')
    ? candidate
    : PANEL_HOME;
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === 'string' && payload.title ? payload.title : 'Essence Vapes';
  const options = {
    body: typeof payload.body === 'string' ? payload.body : '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    // Mismo `tag` = el sistema reemplaza el aviso anterior en vez de apilar duplicados.
    tag: typeof payload.tag === 'string' ? payload.tag : undefined,
    renotify: false,
    // Lo crítico queda en pantalla hasta que alguien lo atienda (donde el sistema lo soporta).
    requireInteraction: payload.critical === true,
    data: { url: safePanelUrl(payload.url) },
  };

  // El navegador exige mostrar una notificación por cada push recibido.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = safePanelUrl(event.notification.data && event.notification.data.url);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Si el panel ya está abierto en alguna pestaña, se reutiliza en vez de abrir otra.
      const panel = windows.find((client) => new URL(client.url).pathname.startsWith('/admin'));
      if (panel) {
        await panel.focus();
        if ('navigate' in panel) {
          try {
            await panel.navigate(url);
          } catch {
            /* Pestaña no controlada por este worker: queda enfocada donde estaba. */
          }
        }
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
