import { TestBed } from '@angular/core/testing';

import { BASE_VARIANT_ID, type MediaAsset, type VariantSummary } from '../../../../../ecommerce/data/product.model';
import { ProductsAdminService } from '../../../../data/products-admin.service';
import { VariantManager } from './variant-manager';

const image = (publicId: string): MediaAsset =>
  ({ publicId, url: `https://res.cloudinary.com/demo/${publicId}.jpg` }) as MediaAsset;

function variant(overrides: Partial<VariantSummary>): VariantSummary {
  return {
    id: 'v200',
    label: '200ml',
    priceValue: 50000,
    price: '$50.000',
    stock: 1,
    images: [],
    featured: false,
    ...overrides,
  };
}

async function render(variants: VariantSummary[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [{ provide: ProductsAdminService, useValue: {} }],
  });
  const fixture = TestBed.createComponent(VariantManager);
  fixture.componentRef.setInput('productId', 'p1');
  fixture.componentRef.setInput('variants', [
    variant({ id: BASE_VARIANT_ID, label: '125ml', images: [image('producto/frente')] }),
    ...variants,
  ]);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('VariantManager - imágenes de cada variante', () => {
  it('una variante que hereda no lista las fotos del producto como si fueran suyas', async () => {
    const element = await render([
      variant({ inheritsImages: true, images: [image('producto/frente'), image('producto/perfil')] }),
    ]);

    expect(element.querySelectorAll('.variant-image-thumb')).toHaveLength(0);
    expect(element.textContent).toContain('usa las del producto');
    // Puede subir sus propias imágenes.
    expect(element.querySelector('.variant-image-add')).not.toBeNull();
  });

  it('una variante con imágenes propias las lista con su botón para quitarlas', async () => {
    const element = await render([
      variant({ inheritsImages: false, images: [image('variante/a'), image('variante/b')] }),
    ]);

    expect(element.querySelectorAll('.variant-image-thumb')).toHaveLength(2);
    expect(element.querySelectorAll('[aria-label="Quitar imagen de la variante"]')).toHaveLength(2);
    expect(element.textContent).not.toContain('usa las del producto');
  });
});
