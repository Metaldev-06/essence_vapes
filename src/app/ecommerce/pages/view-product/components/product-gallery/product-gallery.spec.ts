import { TestBed } from '@angular/core/testing';

import type { Product } from '../../../../data/product.model';
import { PRODUCT_IMAGE_TRANSITION_NAME, ProductViewTransition } from '../../../../data/product-view-transition';
import { ProductGallery } from './product-gallery';

const PRODUCT = {
  id: 'le-male-elixir',
  name: 'Le Male Elixir',
  accent: '#dfd80c',
  variantId: 'v200',
  images: [{ publicId: 'foto', url: 'https://res.cloudinary.com/demo/image/upload/v1/foto.png' }],
  variants: [],
} as unknown as Product;

async function render(): Promise<{ photo: HTMLImageElement; settle: () => Promise<void> }> {
  const fixture = TestBed.createComponent(ProductGallery);
  fixture.componentRef.setInput('product', PRODUCT);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return {
    photo: element.querySelector<HTMLImageElement>('.product-gallery-photo')!,
    settle: () => fixture.whenStable(),
  };
}

describe('ProductGallery - destino de la view transition', () => {
  it('toma el nombre cuando ESTE producto y variante son los que transicionan', async () => {
    TestBed.inject(ProductViewTransition).start('le-male-elixir', 'v200');
    const { photo } = await render();

    expect(photo.style.viewTransitionName).toBe(PRODUCT_IMAGE_TRANSITION_NAME);
  });

  it('no lo toma si transiciona otra variante u otro producto', async () => {
    TestBed.inject(ProductViewTransition).start('le-male-elixir', 'base');
    const { photo } = await render();

    expect(photo.style.viewTransitionName).toBe('');
  });

  it('lo suelta cuando termina la transición', async () => {
    const transition = TestBed.inject(ProductViewTransition);
    transition.start('le-male-elixir', 'v200');
    const { photo, settle } = await render();

    transition.clear();
    await settle();

    expect(photo.style.viewTransitionName).toBe('');
  });
});
