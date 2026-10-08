import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Header {
  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);

  protected readonly userMenuOpen = signal(false);

  protected readonly userInitial = computed(() => {
    const name = this.authService.user()?.fullName.trim() ?? '';
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((value) => !value);
  }

  protected logout(): void {
    this.authService.logout();
    this.userMenuOpen.set(false);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.userMenuOpen()) return;
    const target = event.target as Element | null;
    if (!target?.closest('.user-menu-wrapper')) {
      this.userMenuOpen.set(false);
    }
  }
}
