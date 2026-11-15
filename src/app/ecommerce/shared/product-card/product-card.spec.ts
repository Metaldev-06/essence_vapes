import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { CartService } from '../../../core/cart/cart.service';
import { CompareService } from '../../../core/compare/compare.service';
import { FavoritesService } from '../../../core/favorites/favorites.service';
import { productMainImageUrl } from '../../data/cloudinary-url.helper';
import { PRODUCT_IMAGE_TRANSITION_NAME, ProductViewTransition } from '../../data/product-view-transition';
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

describe('ProductCard - precarga al pasar el mouse', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('pide los datos del producto y baja la foto grande que va a mostrar la ficha', async () => {
    const preloaded: string[] = [];
    vi.stubGlobal(
      'Image',
      class {
        decoding = '';
        set src(value: string) {
          preloaded.push(value);
        }
      },
    );
    const prefetchProduct = vi.fn();
    const cover = 'https://res.cloudinary.com/demo/image/upload/v1/essence-vapes/products/card-hover/foto.png';

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: { getQuantity: () => 0, add: vi.fn() } },
        { provide: FavoritesService, useValue: { isFavorite: () => false, toggle: vi.fn() } },
        {
          provide: CompareService,
          useValue: { maxItems: 4, isComparing: () => false, isFull: () => false, toggle: vi.fn() },
        },
        { provide: ProductsService, useValue: { prefetchProduct } },
      ],
    });
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput('product', {
      ...makeProduct(3),
      images: [{ publicId: 'card-hover/foto', url: cover }],
    } as unknown as Product);
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement).querySelector('article')!.dispatchEvent(new Event('mouseenter'));

    expect(prefetchProduct).toHaveBeenCalledWith('p1');
    expect(preloaded).toEqual([productMainImageUrl(cover)]);
  });
});

describe('ProductCard - view transition hacia la ficha', () => {
  async function renderWithPhoto(): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: { getQuantity: () => 0, add: vi.fn() } },
        { provide: FavoritesService, useValue: { isFavorite: () => false, toggle: vi.fn() } },
        {
          provide: CompareService,
          useValue: { maxItems: 4, isComparing: () => false, isFull: () => false, toggle: vi.fn() },
        },
        { provide: ProductsService, useValue: { prefetchProduct: vi.fn() } },
      ],
    });
    // El click también activa el `routerLink`: acá solo importa la transición, así que la
    // navegación se simula (si no, termina fallando después de que el test ya cerró).
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput('product', {
      ...makeProduct(3),
      variantId: 'v200',
      images: [{ publicId: 'p1/foto', url: 'https://res.cloudinary.com/demo/image/upload/v1/p1/foto.png' }],
    } as unknown as Product);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const photo = (element: HTMLElement) => element.querySelector<HTMLImageElement>('.product-card-photo')!;
  const cover = (element: HTMLElement) => element.querySelector<HTMLAnchorElement>('.product-card-cover-link')!;

  it('antes del click la foto no tiene nombre de transición', async () => {
    const element = await renderWithPhoto();

    expect(photo(element).style.viewTransitionName).toBe('');
  });

  it('al tocar la card, su foto (y solo esta variante) pasa a ser la que transiciona', async () => {
    const element = await renderWithPhoto();

    cover(element).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));

    expect(photo(element).style.viewTransitionName).toBe(PRODUCT_IMAGE_TRANSITION_NAME);
    expect(TestBed.inject(ProductViewTransition).nameFor('p1', 'v200')).toBe(PRODUCT_IMAGE_TRANSITION_NAME);
  });

  it('Ctrl+click (otra pestaña) no arranca una transición en esta', async () => {
    const element = await renderWithPhoto();

    cover(element).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true }));

    expect(photo(element).style.viewTransitionName).toBe('');
    expect(TestBed.inject(ProductViewTransition).activeKey()).toBeNull();
  });
});

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
