import { TestBed } from '@angular/core/testing';

import type { ProductCategory } from '../../../../data/product.model';
import { ProductsGrid } from './products-grid';

async function renderEmpty(category?: ProductCategory | 'todos'): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(ProductsGrid);
  fixture.componentRef.setInput('products', []);
  if (category) fixture.componentRef.setInput('category', category);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const title = (element: HTMLElement) => element.querySelector('.products-empty-title')?.textContent?.trim();

describe('ProductsGrid - sin resultados', () => {
  it('en perfumes y decants habla de fragancias', async () => {
    expect(title(await renderEmpty('perfumes'))).toBe('No encontramos fragancias con esos filtros');
    expect(title(await renderEmpty('decants'))).toBe('No encontramos fragancias con esos filtros');
  });

  it('en vapes y esencias, de vapes y esencias', async () => {
    expect(title(await renderEmpty('vapes'))).toBe('No encontramos vapes con esos filtros');
    expect(title(await renderEmpty('esencias'))).toBe('No encontramos esencias con esos filtros');
  });

  it('en "Todos" (o sin categoría), de productos', async () => {
    expect(title(await renderEmpty('todos'))).toBe('No encontramos productos con esos filtros');
    expect(title(await renderEmpty())).toBe('No encontramos productos con esos filtros');
  });

  it('la sugerencia nombra los sabores en vapes', async () => {
    const element = await renderEmpty('vapes');
    expect(element.querySelector('.products-empty-desc')?.textContent).toContain('sabores');
  });
});
