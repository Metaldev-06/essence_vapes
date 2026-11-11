import { Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { CartService } from '../../../core/cart/cart.service';
import { ProductsService } from '../../data/products.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, NgOptimizedImage],
  templateUrl: './header.html',
  styleUrl: './header.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenus()',
  },
})
export class Header {
  protected readonly authService = inject(AuthService);
  protected readonly cartService = inject(CartService);
  protected readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);

  protected readonly userMenuOpen = signal(false);
  /** Mobile-only navigation dropdown; on desktop the links are always visible. */
  protected readonly navOpen = signal(false);

  protected readonly userInitial = computed(() => {
    const name = this.authService.user()?.fullName.trim() ?? '';
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((value) => !value);
    this.navOpen.set(false);
  }

  protected toggleNav(): void {
    this.navOpen.update((value) => !value);
    this.userMenuOpen.set(false);
  }

  protected closeNav(): void {
    this.navOpen.set(false);
  }

  /** Hover/focus on the "Productos" nav link - warms the catalog's data before the user even
   *  clicks into it (see `ProductsService.prefetchCatalog`). `focus` covers keyboard navigation,
   *  which never fires `mouseenter`. */
  protected prefetchProductsPage(): void {
    this.productsService.prefetchCatalog();
  }

  protected closeMenus(): void {
    this.navOpen.set(false);
    this.userMenuOpen.set(false);
  }

  protected logout(): void {
    this.authService.logout();
    this.userMenuOpen.set(false);
    this.navOpen.set(false);
    // `/cuenta` requires auth (authOnlyGuard) but that guard only runs on navigation, not
    // reactively - without this, logging out while inside it leaves its stale content on screen.
    if (this.router.url.startsWith('/cuenta')) {
      void this.router.navigateByUrl('/');
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (this.userMenuOpen() && !target?.closest('.user-menu-wrapper')) {
      this.userMenuOpen.set(false);
    }
    if (this.navOpen() && !target?.closest('.header__nav, .nav-toggle')) {
      this.navOpen.set(false);
    }
  }
}
