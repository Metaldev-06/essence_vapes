import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

const SITE_URL = 'https://essencevapes.com.ar';

interface RouteSeoData {
  readonly description?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /** Starts syncing <title>, meta description, OG tags and the canonical link on every navigation. */
  init(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.deepestRouteData()),
      )
      .subscribe((data) => this.applyMeta(data));
  }

  private deepestRouteData(): RouteSeoData {
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.snapshot.data as RouteSeoData;
  }

  private applyMeta(data: RouteSeoData): void {
    const pageTitle = this.title.getTitle();
    const description = data.description ?? this.meta.getTag('name="description"')?.content ?? '';

    if (description) {
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:description', content: description });
      this.meta.updateTag({ name: 'twitter:description', content: description });
    }

    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:url', content: SITE_URL + this.document.location.pathname });

    this.updateCanonical(SITE_URL + this.document.location.pathname);
  }

  private updateCanonical(url: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Datos estructurados (Schema.org) específicos de la página actual - p. ej. Product+Offer en
   * una ficha de producto, u Organization en la ficha del vendedor. Pasar `null` los quita (el
   * componente que los seteó debe hacerlo en su `ngOnDestroy`/`DestroyRef`, para no dejar un
   * JSON-LD de una página anterior visible en la siguiente). Nunca debe contener precios, stock
   * ni valoraciones inventados - solo datos reales del recurso ya cargado.
   */
  setStructuredData(data: Record<string, unknown> | null): void {
    const id = 'dynamic-structured-data';
    let script = this.document.querySelector<HTMLScriptElement>(`script#${id}`);

    if (!data) {
      script?.remove();
      return;
    }

    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }
}
