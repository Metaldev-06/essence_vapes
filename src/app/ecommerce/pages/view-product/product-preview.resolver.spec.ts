import { TestBed } from '@angular/core/testing';
import {
  Router,
  convertToParamMap,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from '@angular/router';

import { productMainImageUrl } from '../../data/cloudinary-url.helper';
import type { Product } from '../../data/product.model';
import { ProductsService } from '../../data/products.service';
import { PRODUCT_PREVIEW_BUDGET_MS, coverImageFor, productPreviewResolver } from './product-preview.resolver';

const image = (name: string) => ({ publicId: name, url: `https://res.cloudinary.com/demo/image/upload/v1/${name}.png` });

const PRODUCT = {
  id: 'le-male-elixir',
  images: [image('base')],
  variants: [
    { id: 'base', images: [image('base')] },
    { id: 'v200', images: [image('v200')] },
  ],
} as unknown as Product;

function run(params: { id?: string; variant?: string }): Promise<Product | null> {
  const route = {
    paramMap: convertToParamMap(params.id ? { id: params.id } : {}),
    queryParamMap: convertToParamMap(params.variant ? { variant: params.variant } : {}),
  } as ActivatedRouteSnapshot;
  return TestBed.runInInjectionContext(
    () => productPreviewResolver(route, {} as RouterStateSnapshot) as Promise<Product | null>,
  );
}

describe('coverImageFor', () => {
  it('usa la primera foto de la variante elegida, o la del producto', () => {
    expect(coverImageFor(PRODUCT, 'v200')?.publicId).toBe('v200');
    expect(coverImageFor(PRODUCT, null)?.publicId).toBe('base');
    expect(coverImageFor(PRODUCT, 'no-existe')?.publicId).toBe('base');
  });
});

describe('productPreviewResolver', () => {
  const loadForNavigation = vi.fn();
  const prefetchProduct = vi.fn();
  const decoded: string[] = [];

  beforeEach(() => {
    loadForNavigation.mockReset();
    prefetchProduct.mockReset();
    decoded.length = 0;
    vi.stubGlobal(
      'Image',
      class {
        decoding = '';
        src = '';
        decode(): Promise<void> {
          decoded.push(this.src);
          return Promise.resolve();
        }
      },
    );
    TestBed.configureTestingModule({
      providers: [{ provide: ProductsService, useValue: { loadForNavigation, prefetchProduct } }],
    });
    // Navegación dentro del sitio (ya hubo una primera navegación): es cuando hay transición.
    TestBed.inject(Router).navigated = true;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('al entrar directo a la URL (primera carga) no demora la apertura: solo arranca el pedido', async () => {
    TestBed.inject(Router).navigated = false;

    await expect(run({ id: 'le-male-elixir' })).resolves.toBeNull();

    expect(prefetchProduct).toHaveBeenCalledWith('le-male-elixir');
    expect(loadForNavigation).not.toHaveBeenCalled();
  });

  it('devuelve el producto y deja decodificada la foto que va a mostrar la galería', async () => {
    loadForNavigation.mockResolvedValue(PRODUCT);

    await expect(run({ id: 'le-male-elixir', variant: 'v200' })).resolves.toBe(PRODUCT);

    expect(loadForNavigation).toHaveBeenCalledWith('le-male-elixir', PRODUCT_PREVIEW_BUDGET_MS);
    expect(decoded).toEqual([productMainImageUrl(image('v200').url)]);
  });

  it('si el producto no llega a tiempo, la ficha se abre igual (sin preview)', async () => {
    loadForNavigation.mockResolvedValue(undefined);

    await expect(run({ id: 'le-male-elixir' })).resolves.toBeNull();
    expect(decoded).toEqual([]);
  });

  it('sin id no hace nada', async () => {
    await expect(run({})).resolves.toBeNull();
    expect(loadForNavigation).not.toHaveBeenCalled();
  });
});
