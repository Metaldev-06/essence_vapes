import { cloudinaryUrl, preloadImage, productMainImageUrl } from './cloudinary-url.helper';

const ORIGINAL =
  'https://res.cloudinary.com/demo/image/upload/v1/essence-vapes/products/club-de-nuit/foto.png';

describe('cloudinaryUrl', () => {
  it('inserta formato, calidad y ancho después de /upload/', () => {
    expect(cloudinaryUrl(ORIGINAL, 480)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_480/v1/essence-vapes/products/club-de-nuit/foto.png',
    );
  });

  it('no toca una URL que no es de Cloudinary', () => {
    expect(cloudinaryUrl('https://example.com/foto.png', 480)).toBe('https://example.com/foto.png');
  });
});

describe('productMainImageUrl', () => {
  it('es la versión de 800px que muestra la galería de la ficha', () => {
    expect(productMainImageUrl(ORIGINAL)).toBe(cloudinaryUrl(ORIGINAL, 800));
  });
});

describe('preloadImage', () => {
  const created: { src: string }[] = [];

  beforeEach(() => {
    created.length = 0;
    vi.stubGlobal(
      'Image',
      class {
        decoding = '';
        src = '';
        constructor() {
          created.push(this);
        }
      },
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('descarga la imagen en segundo plano', () => {
    const url = productMainImageUrl(`${ORIGINAL}?a`);
    preloadImage(url);

    expect(created.map((image) => image.src)).toEqual([url]);
  });

  it('no la vuelve a pedir si ya se precargó', () => {
    const url = productMainImageUrl(`${ORIGINAL}?b`);
    preloadImage(url);
    preloadImage(url);
    preloadImage(url);

    expect(created).toHaveLength(1);
  });
});
