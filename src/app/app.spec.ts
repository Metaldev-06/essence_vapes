import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      // Router: `<router-outlet>` y SeoService (lee la ruta actual). HTTP de prueba: ningún
      // pedido sale a la red.
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  // Reemplaza al "should render title" que generó Angular CLI: buscaba un <h1> con
  // "Hello, essence_vapes_front", el texto de ejemplo del proyecto recién creado, que la App
  // real ya no tiene. Esto verifica lo que la App sí muestra.
  it('muestra el contenido de la página y el aviso de límite de solicitudes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.app-content router-outlet')).not.toBeNull();
    expect(compiled.querySelector('app-rate-limit-modal')).not.toBeNull();
  });
});
