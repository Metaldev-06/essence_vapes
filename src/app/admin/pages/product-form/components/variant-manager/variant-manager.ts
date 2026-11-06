import { Component, computed, inject, input, output, signal } from '@angular/core';
import { extractErrorMessage } from '../../../../data/extract-error-message';
import { ProductsAdminService } from '../../../../data/products-admin.service';
import {
  BASE_VARIANT_ID,
  type Product,
  type VariantSummary,
} from '../../../../../ecommerce/data/product.model';
import { ToggleSwitch } from '../../../../shared/toggle-switch/toggle-switch';

// Mirrors MAX_IMAGES_PER_PRODUCT (backend reuses the same constant for variant images too).
const MAX_VARIANT_IMAGES = 6;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-variant-manager',
  imports: [ToggleSwitch],
  templateUrl: './variant-manager.html',
  styleUrl: './variant-manager.css',
})
export class VariantManager {
  private readonly productsAdminService = inject(ProductsAdminService);

  readonly productId = input.required<string>();
  readonly variants = input.required<readonly VariantSummary[]>();

  readonly variantsChanged = output<Product>();

  protected readonly maxImages = MAX_VARIANT_IMAGES;
  protected readonly maxImageMb = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);

  protected readonly extraVariants = computed(() =>
    this.variants().filter((variant) => variant.id !== BASE_VARIANT_ID),
  );

  protected readonly isAdding = signal(false);
  protected readonly savingNew = signal(false);
  protected readonly savingId = signal<string | null>(null);
  protected readonly uploadingId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected async addVariant(
    labelRaw: string,
    priceRaw: string,
    stockRaw: string,
  ): Promise<void> {
    const label = labelRaw.trim();
    const priceValue = Number(priceRaw);
    const stock = stockRaw.trim() === '' ? 0 : Number(stockRaw);

    if (!label) {
      this.error.set('La etiqueta de la variante es obligatoria');
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      this.error.set('El precio de la variante debe ser un número válido');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      this.error.set('El stock de la variante debe ser un número válido');
      return;
    }

    this.savingNew.set(true);
    this.error.set(null);
    try {
      const product = await this.productsAdminService.addVariant(this.productId(), {
        label,
        priceValue,
        stock,
      });
      this.variantsChanged.emit(product);
      this.isAdding.set(false);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.savingNew.set(false);
    }
  }

  protected async saveVariant(
    variantId: string,
    labelRaw: string,
    priceRaw: string,
    stockRaw: string,
  ): Promise<void> {
    const label = labelRaw.trim();
    const priceValue = Number(priceRaw);
    const stock = Number(stockRaw);

    if (!label) {
      this.error.set('La etiqueta de la variante es obligatoria');
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      this.error.set('El precio de la variante debe ser un número válido');
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      this.error.set('El stock de la variante debe ser un número válido');
      return;
    }

    this.savingId.set(variantId);
    this.error.set(null);
    try {
      const product = await this.productsAdminService.updateVariant(this.productId(), variantId, {
        label,
        priceValue,
        stock,
      });
      this.variantsChanged.emit(product);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.savingId.set(null);
    }
  }

  protected async toggleFeatured(variantId: string, featured: boolean): Promise<void> {
    this.savingId.set(variantId);
    this.error.set(null);
    try {
      const product = await this.productsAdminService.updateVariant(this.productId(), variantId, {
        featured,
      });
      this.variantsChanged.emit(product);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.savingId.set(null);
    }
  }

  protected async removeVariant(variantId: string): Promise<void> {
    const confirmed = confirm('¿Eliminar esta variante? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    this.savingId.set(variantId);
    this.error.set(null);
    try {
      const product = await this.productsAdminService.removeVariant(this.productId(), variantId);
      this.variantsChanged.emit(product);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.savingId.set(null);
    }
  }

  protected async onVariantImageSelected(variantId: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    const current = this.extraVariants().find((variant) => variant.id === variantId);
    if (current && current.images.length + files.length > this.maxImages) {
      this.error.set(`Una variante puede tener como máximo ${this.maxImages} imágenes`);
      return;
    }
    const tooBig = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (tooBig) {
      this.error.set(`"${tooBig.name}" supera los ${this.maxImageMb}MB permitidos`);
      return;
    }

    this.uploadingId.set(variantId);
    this.error.set(null);
    try {
      const product = await this.productsAdminService.uploadVariantImages(
        this.productId(),
        variantId,
        files,
      );
      this.variantsChanged.emit(product);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.uploadingId.set(null);
    }
  }

  protected async removeVariantImage(variantId: string, publicId: string): Promise<void> {
    this.uploadingId.set(variantId);
    this.error.set(null);
    try {
      const product = await this.productsAdminService.removeVariantImage(
        this.productId(),
        variantId,
        publicId,
      );
      this.variantsChanged.emit(product);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.uploadingId.set(null);
    }
  }
}
