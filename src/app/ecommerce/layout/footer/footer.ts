import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
}
