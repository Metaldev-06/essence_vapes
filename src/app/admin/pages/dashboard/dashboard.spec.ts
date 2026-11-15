import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminAuthService } from '../../data/admin-auth.service';
import { OrdersAdminService, type SalesSummary } from '../../data/orders-admin.service';
import { ProductsAdminService } from '../../data/products-admin.service';
import Dashboard from './dashboard';

const EMPTY: SalesSummary = {
  ordersCount: 0,
  grossOrdersValue: 0,
  pendingOrdersCount: 0,
  cancelledOrdersCount: 0,
  paidOrdersCount: 0,
  approvedPaymentsValue: 0,
  averageTicketValue: 0,
  unitsSoldCount: 0,
  refundedOrdersCount: 0,
  refundedAmountValue: 0,
};

async function render(current: SalesSummary, previous: SalesSummary): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AdminAuthService,
        useValue: { user: signal({ id: 'a1', fullName: 'Administrador', email: 'admin@test.com', role: 'admin' }) },
      },
      {
        provide: OrdersAdminService,
        useValue: {
          getSalesSummary: () => Promise.resolve({ current, previous }),
          getSalesTimeseries: () => Promise.resolve([]),
          getSalesByCategory: () => Promise.resolve([]),
          getTopProducts: () => Promise.resolve([]),
          // Panel secundario: si falla, el dashboard simplemente no lo muestra.
          getStats: () => Promise.reject(new Error('sin datos')),
        },
      },
      {
        provide: ProductsAdminService,
        useValue: {
          list: () =>
            Promise.resolve({ data: [], pagination: { total: 0, pages: 0, current: 1, limit: 100, offset: 0 } }),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(Dashboard);
  const element = fixture.nativeElement as HTMLElement;
  // La carga de ventas la dispara un `effect`: se espera a que las tarjetas estén en pantalla.
  await vi.waitFor(async () => {
    await fixture.whenStable();
    expect(element.querySelector('.kpi-card-trend')).not.toBeNull();
  });
  return element;
}

describe('Dashboard - comparación con el período anterior', () => {
  it('sin ventas en ningún período muestra 0% y nunca "NaN%"', async () => {
    const element = await render(EMPTY, EMPTY);
    const trends = Array.from(element.querySelectorAll('.kpi-card-trend')).map((node) => node.textContent ?? '');

    expect(trends.length).toBeGreaterThan(0);
    expect(element.textContent).not.toContain('NaN');
    expect(trends.every((text) => text.includes('0.0%'))).toBe(true);
  });

  it('calcula la variación real de cada métrica', async () => {
    const element = await render(
      { ...EMPTY, ordersCount: 3, paidOrdersCount: 3 },
      { ...EMPTY, ordersCount: 2, paidOrdersCount: 2 },
    );

    expect(element.textContent).toContain('+50.0%');
    expect(element.textContent).not.toContain('NaN');
  });
});
