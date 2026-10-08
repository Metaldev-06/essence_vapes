import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AdminAuthService } from '../../data/admin-auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  protected readonly adminAuthService = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly adminInitial = computed(() => {
    const name = this.adminAuthService.user()?.fullName.trim() ?? '';
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  protected logout(): void {
    this.adminAuthService.logout();
    void this.router.navigateByUrl('/admin/login');
  }
}
