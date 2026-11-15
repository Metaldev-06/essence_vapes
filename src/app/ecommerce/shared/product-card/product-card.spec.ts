import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CartService } from '../../../core/cart/cart.service';
import { CompareService } from '../../../core/compare/compare.service';
import { FavoritesService } from '../../../core/favorites/favorites.service';
import type { Product } from '../../data/product.model';
import { ProductsService } from '../../data/products.service';
import { ProductCard } from './product-card';

function makeProduct(stock: number): Product {
  return {
    id: 'p1',
    brand: 'Jean Paul Gaultier',
    name: 'Le Male Elixir',
    subtitle: '',
    notes: [],
    price: '$21.000',
    priceValue: 21000,
    accent: '#d4c21a',
    category: 'perfumes',
    styles: [],
    featured: false,
    gender: 'masculino',
    images: [],
    videos: [],
    stock,
    isActive: true,
    variantId: 'base',
    variantLabel: '125ml',
    variants: [],
  } as unknown as Product;
}

async function render(stock: number, cartQuantity = 0): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: CartService, useValue: { getQuantity: () => cartQuantity, add: vi.fn() } },
      { provide: FavoritesService, useValue: { isFavorite: () => false, toggle: vi.fn() } },
      {
        provide: CompareService,
        useValue: { maxItems: 4, isComparing: () => false, isFull: () => false, toggle: vi.fn() },
      },
      { provide: ProductsService, useValue: { prefetchProduct: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(ProductCard);
  fixture.componentRef.setInput('product', makeProduct(stock));
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('ProductCard - sin stock', () => {
  it('un producto agotado lo dice en la card y no deja agregarlo al carrito', async () => {
    const element = await render(0);

    expect(element.querySelector('.product-card-sold-out')?.textContent?.trim()).toBe('Sin stock');
    expect(element.querySelector('.product-card--sold-out')).not.toBeNull();
    expect(element.querySelector<HTMLButtonElement>('.product-card-cart')?.disabled).toBe(true);
  });

  it('un producto con stock no muestra la etiqueta', async () => {
    const element = await render(3);

    expect(element.querySelector('.product-card-sold-out')).toBeNull();
    expect(element.querySelector('.product-card--sold-out')).toBeNull();
    expect(element.querySelector<HTMLButtonElement>('.product-card-cart')?.disabled).toBe(false);
  });

  it('tener en el carrito todas las unidades no lo marca como "sin stock"', async () => {
    const element = await render(1, 1);

    expect(element.querySelector('.product-card-sold-out')).toBeNull();
    expect(element.querySelector<HTMLButtonElement>('.product-card-cart')?.disabled).toBe(true);
  });
});
