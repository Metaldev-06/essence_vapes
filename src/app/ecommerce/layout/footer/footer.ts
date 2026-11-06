import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LegalInfoService } from '../../data/legal-info.service';

interface FooterLink {
  readonly label: string;
  readonly routerLink: string;
  readonly queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  protected readonly legalInfoService = inject(LegalInfoService);
  protected readonly year = new Date().getFullYear();

  protected readonly navLinks: readonly FooterLink[] = [
    { label: 'Inicio', routerLink: '/' },
    { label: 'Productos', routerLink: '/productos' },
    { label: 'Contacto', routerLink: '/contacto' },
  ];

  protected readonly categoryLinks: readonly FooterLink[] = [
    { label: 'Perfumes', routerLink: '/productos', queryParams: { cat: 'perfumes' } },
    { label: 'Decants', routerLink: '/productos', queryParams: { cat: 'decants' } },
    { label: 'Vapes', routerLink: '/productos', queryParams: { cat: 'vapes' } },
    { label: 'Esencias', routerLink: '/productos', queryParams: { cat: 'esencias' } },
  ];

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
