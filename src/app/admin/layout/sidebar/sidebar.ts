import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AdminAuthService } from '../../data/admin-auth.service';
import { MessagesAdminService } from '../../data/messages-admin.service';
import { ConfirmDialog, type ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';

const UNREAD_POLL_MS = 60_000;
const COLLAPSE_STORAGE_KEY = 'essence-vapes-admin-sidebar-collapsed';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, ConfirmDialog],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  host: { '[class.collapsed]': 'collapsed()' },
})
export class Sidebar {
  protected readonly adminAuthService = inject(AdminAuthService);
  private readonly messagesAdminService = inject(MessagesAdminService);
  private readonly router = inject(Router);

  protected readonly adminInitial = computed(() => {
    const name = this.adminAuthService.user()?.fullName.trim() ?? '';
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  /** Solo afecta el layout de escritorio - en mobile el sidebar siempre es la franja horizontal
   *  existente, angosta por diseño, así que "colapsar" no aplica ahí. */
  protected readonly collapsed = signal(localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');

  protected toggleCollapsed(): void {
    this.collapsed.update((value) => !value);
    localStorage.setItem(COLLAPSE_STORAGE_KEY, this.collapsed() ? '1' : '0');
  }

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

  protected readonly logoutDialogOpen = signal(false);
  protected readonly logoutDialogData: ConfirmDialogData = {
    title: 'Cerrar sesión',
    message: '¿Seguro que querés cerrar sesión?',
    confirmLabel: 'Cerrar sesión',
    cancelLabel: 'Cancelar',
    tone: 'default',
  };

  protected askLogoutConfirmation(): void {
    this.logoutDialogOpen.set(true);
  }

  protected cancelLogout(): void {
    this.logoutDialogOpen.set(false);
  }

  protected confirmLogout(): void {
    this.logoutDialogOpen.set(false);
    this.adminAuthService.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
