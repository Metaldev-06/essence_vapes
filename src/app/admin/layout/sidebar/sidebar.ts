import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AdminAuthService } from '../../data/admin-auth.service';
import { MessagesAdminService } from '../../data/messages-admin.service';

const UNREAD_POLL_MS = 60_000;

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  protected readonly adminAuthService = inject(AdminAuthService);
  private readonly messagesAdminService = inject(MessagesAdminService);
  private readonly router = inject(Router);

  protected readonly adminInitial = computed(() => {
    const name = this.adminAuthService.user()?.fullName.trim() ?? '';
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  /** Pollea cada 60s en vez de abrir su propia conexión SSE - la página de Mensajes ya tiene la
   *  suya cuando está abierta; esto solo es para que el badge del sidebar no quede desactualizado
   *  cuando el admin está en otra sección. */
  protected readonly unreadMessagesCount = signal(0);
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    void this.refreshUnreadCount();
    this.pollTimer = setInterval(() => void this.refreshUnreadCount(), UNREAD_POLL_MS);
  }

  ngOnDestroy(): void {
    clearInterval(this.pollTimer);
  }

  private async refreshUnreadCount(): Promise<void> {
    try {
      const summary = await this.messagesAdminService.listInboxes();
      this.unreadMessagesCount.set(summary.reduce((sum, i) => sum + i.unread, 0));
    } catch {
      /* El badge simplemente no se actualiza esta vez - no es crítico. */
    }
  }

  protected logout(): void {
    this.adminAuthService.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
