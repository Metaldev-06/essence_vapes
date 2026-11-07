import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { CartService } from '../../../../../core/cart/cart.service';
import { FavoritesService } from '../../../../../core/favorites/favorites.service';
import { AgeVerificationService } from '../../../../../core/age-verification/age-verification.service';
import {
  CATEGORY_LABELS,
  CONCENTRATION_LABELS,
  type Gender,
  type Product,
} from '../../../../data/product.model';

const GENDER_LABELS: Record<Gender, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  unisex: 'Unisex',
};

@Component({
  selector: 'app-product-details',
  imports: [],
  templateUrl: './product-details.html',
  styleUrl: './product-details.css',
})
export class ProductDetails {
  private readonly cartService = inject(CartService);
  private readonly favoritesService = inject(FavoritesService);
  protected readonly ageVerificationService = inject(AgeVerificationService);

  readonly product = input.required<Product>();
  /** Two-way bound with the parent page, so switching a pill can also update the gallery photo. */
  readonly selectedVariantId = model<string>('');

  protected readonly categoryLabel = computed(() => CATEGORY_LABELS[this.product().category]);
  /** Every current category label pluralizes with a plain trailing "s" ("Decants", "Vapes"...). */
  protected readonly formatLabel = computed(
    () => `Formato (${this.categoryLabel().toLowerCase().replace(/s$/, '')})`,
  );
  protected readonly concentrationLabel = computed(() => {
    const concentration = this.product().concentration;
    return concentration ? CONCENTRATION_LABELS[concentration] : undefined;
  });

  protected readonly genderLabel = computed(() => {
    const gender = this.product().gender;
    return gender ? GENDER_LABELS[gender] : undefined;
  });

  protected readonly hasQuickFacts = computed(() => {
    const product = this.product();
    return Boolean(product.year || product.origin || product.gender);
  });

  /** Datos regulatorios reales a mostrar - nunca inventados, solo lo que el admin completó. */
  protected readonly hasRegulatoryInfo = computed(() => {
    const product = this.product();
    return Boolean(
      product.countryOfOrigin ||
        product.concentration ||
        product.netContentMl ||
        product.manufacturerOrImporter ||
        product.sanitaryRegistrationNumber,
    );
  });

  protected readonly isDecant = computed(() => this.product().category === 'decants');

  /** Edad real (fecha de nacimiento, no un checkbox) - ver Ley 26.687 y Disposición ANMAT 2543/2026. */
  protected readonly needsAgeVerification = computed(
    () => this.product().requiresAgeVerification && !this.ageVerificationService.verified(),
  );
  protected readonly birthDate = signal('');
  protected readonly ageError = signal<string | null>(null);

  protected readonly starFills = computed(() => {
    const rating = this.product().rating ?? 0;
    return [1, 2, 3, 4, 5].map((step) => Math.min(100, Math.max(0, (rating - (step - 1)) * 100)));
  });

  protected readonly showVariantPicker = computed(() => this.product().variants.length > 1);

  protected readonly activeVariant = computed(() => {
    const product = this.product();
    return (
      product.variants.find((variant) => variant.id === this.selectedVariantId()) ??
      product.variants[0]
    );
  });

  /** The product as seen by the cart/stock logic below - price/stock/images of the chosen variant. */
  protected readonly activeProduct = computed<Product>(() => {
    const product = this.product();
    const variant = this.activeVariant();
    return {
      ...product,
      variantId: variant.id,
      variantLabel: variant.label,
      priceValue: variant.priceValue,
      price: variant.price,
      stock: variant.stock,
      images: variant.images,
    };
  });

  protected readonly isFavorite = computed(() =>
    this.favoritesService.isFavorite(this.product().id, this.activeVariant().id),
  );

  protected readonly quantity = signal(1);

  protected readonly inCartQuantity = computed(() =>
    this.cartService.getQuantity(this.product().id, this.activeVariant().id),
  );
  protected readonly remainingStock = computed(() =>
    Math.max(0, this.activeProduct().stock - this.inCartQuantity()),
  );
  protected readonly isOutOfStock = computed(
    () => !this.product().isActive || this.remainingStock() === 0,
  );
  protected readonly stockStatus = computed<'out' | 'low' | 'in'>(() => {
    if (this.isOutOfStock()) return 'out';
    if (this.remainingStock() <= 5) return 'low';
    return 'in';
  });
  protected readonly cartError = signal<string | null>(null);
  protected readonly adding = signal(false);

  constructor() {
    // A quantity valid for one size might exceed another's stock, so reset on every switch.
    effect(() => {
      this.activeVariant();
      this.quantity.set(1);
    });
  }

  protected selectVariant(variantId: string): void {
    this.selectedVariantId.set(variantId);
  }

  protected toggleFavorite(): void {
    void this.favoritesService.toggle(this.product().id, this.activeVariant().id);
  }

  protected confirmAge(event: Event): void {
    event.preventDefault();
    const ok = this.ageVerificationService.verify(this.birthDate());
    this.ageError.set(ok ? null : 'Tenés que ser mayor de 18 años para comprar este producto.');
  }

  protected onBirthDateInput(event: Event): void {
    this.birthDate.set((event.target as HTMLInputElement).value);
  }

  protected decreaseQuantity(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  protected increaseQuantity(): void {
    this.quantity.update((value) => Math.min(this.remainingStock() || 1, value + 1));
  }

  protected async addToCart(): Promise<void> {
    if (this.isOutOfStock() || this.adding() || this.needsAgeVerification()) return;

    this.adding.set(true);
    this.cartError.set(null);
    const quantityToAdd = Math.min(this.quantity(), this.remainingStock());
    const result = await this.cartService.add(this.activeProduct(), quantityToAdd);
    this.adding.set(false);

    if (result.success) {
      this.quantity.set(1);
    } else {
      this.cartError.set(result.message ?? 'No pudimos agregar el producto al carrito');
    }
  }
}
