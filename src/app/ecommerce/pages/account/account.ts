import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

/**
 * `/cuenta` - shell visual tipo panel de admin (sidebar + contenido), protegido por
 * `authOnlyGuard`. Las secciones reales viven en rutas hijas (`informacion-personal`,
 * `seguridad`) - este componente solo es el layout compartido, igual patrón que `Admin`/
 * `Sidebar` en `app/admin/` (ver ese sidebar para el estilo visual que se está replicando acá).
 * Sin botón de cerrar sesión propio - ya está en el header, no se duplica acá.
 */
@Component({
  selector: 'app-account',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export default class Account {
  protected readonly authService = inject(AuthService);

  protected readonly userInitial = computed(() => {
    const name = this.authService.user()?.fullName.trim() ?? '';
    return name ? name.charAt(0).toUpperCase() : '?';
  });
}
