import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LegalInfoService } from '../../data/legal-info.service';
import type { ProductCategory } from '../../data/product.model';
import { ProductsFiltersStore, isModifiedClick } from '../../data/products-filters-store';

interface FooterLink {
  readonly label: string;
  readonly routerLink: string;
}

interface CategoryLink {
  readonly label: string;
  readonly category: ProductCategory;
}

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  protected readonly legalInfoService = inject(LegalInfoService);
  private readonly filtersStore = inject(ProductsFiltersStore);
  protected readonly year = new Date().getFullYear();

  protected readonly navLinks: readonly FooterLink[] = [
    { label: 'Inicio', routerLink: '/' },
    { label: 'Productos', routerLink: '/productos' },
    { label: 'Contacto', routerLink: '/contacto' },
  ];

  /**
   * Antes eran `/productos?cat=perfumes`, pero el catálogo nunca lee la URL (los filtros viven en
   * `ProductsFiltersStore`) y mostraba "Todos". Ahora el link va a `/productos` y el click elige
   * la categoría en el store - igual que las tarjetas de categorías del home.
   */
  protected readonly categoryLinks: readonly CategoryLink[] = [
    { label: 'Perfumes', category: 'perfumes' },
    { label: 'Decants', category: 'decants' },
    { label: 'Vapes', category: 'vapes' },
    { label: 'Esencias', category: 'esencias' },
  ];

  protected openCategory(event: MouseEvent, category: ProductCategory): void {
    if (isModifiedClick(event)) return;
    this.filtersStore.showCategory(category);
  }

  protected readonly legalLinks: readonly FooterLink[] = [
    { label: 'Botón de arrepentimiento', routerLink: '/arrepentimiento' },
    { label: 'Términos y condiciones', routerLink: '/legales/terminos' },
    { label: 'Política de privacidad', routerLink: '/legales/privacidad' },
    { label: 'Política de cookies', routerLink: '/legales/cookies' },
    { label: 'Envíos y entregas', routerLink: '/legales/envios' },
    { label: 'Cambios y devoluciones', routerLink: '/legales/cambios-y-devoluciones' },
    { label: 'Identificación del vendedor', routerLink: '/legales/identificacion' },
  ];
}
