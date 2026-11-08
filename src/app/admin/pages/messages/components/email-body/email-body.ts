import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';

/**
 * Renderiza el HTML de un correo (ya sanitizado en el backend - ver `sanitize-email-html.helper`)
 * dentro de un `<iframe sandbox>` SIN `allow-scripts` ni `allow-same-origin` - segunda capa de
 * seguridad real: aunque algo se colara en el sanitizado del backend, el sandbox del navegador le
 * impide ejecutar JS o acceder al resto de la página. `srcdoc` vía blob URL evita además que el
 * iframe pueda hacer top-level navigation.
 */
@Component({
  selector: 'app-email-body',
  template: `<iframe
    [src]="srcUrl()"
    sandbox="allow-popups allow-popups-to-escape-sandbox"
    referrerpolicy="no-referrer"
    title="Contenido del correo"
    class="email-body-frame"
  ></iframe>`,
  styles: [
    `
      .email-body-frame {
        width: 100%;
        min-height: 120px;
        border: none;
        background: #ffffff;
        border-radius: 10px;
      }
    `,
  ],
})
export class EmailBody {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly html = input.required<string>();

  protected readonly srcUrl = signal<SafeResourceUrl>('about:blank');
  private currentObjectUrl: string | null = null;

  constructor() {
    effect(() => {
      const html = this.html();
      const wrapped =
        `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">` +
        `<style>body{font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;margin:12px;` +
        `color:#1a1a1a;word-wrap:break-word;overflow-wrap:anywhere}img{max-width:100%;height:auto}` +
        `table{max-width:100%}</style></head><body>${html}</body></html>`;

      const previous = this.currentObjectUrl;
      const url = URL.createObjectURL(new Blob([wrapped], { type: 'text/html' }));
      this.currentObjectUrl = url;
      this.srcUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      if (previous) URL.revokeObjectURL(previous);
    });

    this.destroyRef.onDestroy(() => {
      if (this.currentObjectUrl) URL.revokeObjectURL(this.currentObjectUrl);
    });
  }
}
