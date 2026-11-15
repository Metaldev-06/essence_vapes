import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { API_BASE_URL } from '../core/config/api.config';
import { Ecommerce } from './ecommerce';
import type { LegalInfo } from './data/legal-info.service';

const LEGAL_INFO: LegalInfo = {
  businessName: 'Essence Vapes',
  legalName: '',
  cuit: '',
  address: '',
  province: '',
  locality: '',
  supportEmail: '',
  whatsapp: '',
  businessHours: '',
  vapesSaleEnforcementEnabled: false,
};

describe('Ecommerce', () => {
  let component: Ecommerce;
  let fixture: ComponentFixture<Ecommerce>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ecommerce],
      // Router: header/footer usan `routerLink` y SeoService lee la ruta actual. HTTP de prueba:
      // ningún pedido sale a la red.
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Ecommerce);
    component = fixture.componentInstance;

    // El footer pide los datos del vendedor al crearse: sin respuesta, el componente nunca queda
    // estable y `whenStable()` se cuelga.
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne(`${API_BASE_URL}/legal/info`).flush(LEGAL_INFO);
    await fixture.whenStable();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
