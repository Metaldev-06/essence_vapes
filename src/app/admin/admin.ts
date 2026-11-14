import { Component, DOCUMENT, DestroyRef, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Sidebar } from './layout/sidebar/sidebar';
import { Topbar } from './layout/topbar/topbar';
import { SessionExpiryModal } from './shared/session-expiry-modal/session-expiry-modal';

const MANIFEST_URL = '/admin.webmanifest';

@Component({
  selector: 'app-admin',
  imports: [RouterOutlet, Sidebar, Topbar, SessionExpiryModal],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  constructor() {
    // El manifest se enlaza solo mientras se está dentro del panel: así "Agregar a inicio"
    // instala el panel (requisito de iOS para recibir push) y la tienda pública no se ofrece
    // como app instalable.
    const document = inject(DOCUMENT);
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = MANIFEST_URL;
    document.head.appendChild(link);
    inject(DestroyRef).onDestroy(() => link.remove());
  }
}
