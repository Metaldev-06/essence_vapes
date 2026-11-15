import { TestBed } from '@angular/core/testing';

import {
  PRODUCT_IMAGE_TRANSITION_NAME,
  ProductViewTransition,
  productTransitionKey,
} from './product-view-transition';

describe('ProductViewTransition', () => {
  it('sin transición en curso, ninguna imagen tiene nombre', () => {
    const transition = TestBed.inject(ProductViewTransition);

    expect(transition.nameFor('le-male-elixir', 'base')).toBeNull();
  });

  it('solo el producto y la variante que se tocaron llevan el nombre', () => {
    const transition = TestBed.inject(ProductViewTransition);
    transition.start('le-male-elixir', 'v200');

    expect(transition.nameFor('le-male-elixir', 'v200')).toBe(PRODUCT_IMAGE_TRANSITION_NAME);
    // La otra variante del MISMO perfume no: dos elementos con el mismo nombre cancelan la transición.
    expect(transition.nameFor('le-male-elixir', 'base')).toBeNull();
    expect(transition.nameFor('le-beau', 'base')).toBeNull();
  });

  it('al terminar la transición se limpia', () => {
    const transition = TestBed.inject(ProductViewTransition);
    transition.start('le-male-elixir', 'base');

    transition.clear();

    expect(transition.nameFor('le-male-elixir', 'base')).toBeNull();
  });

  it('sin variante equivale a la base', () => {
    expect(productTransitionKey('p1', undefined)).toBe(productTransitionKey('p1', 'base'));
    expect(productTransitionKey('p1', '')).toBe(productTransitionKey('p1', 'base'));
  });
});
