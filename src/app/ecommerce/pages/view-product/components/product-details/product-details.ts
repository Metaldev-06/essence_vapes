import { Component, computed, inject, input, signal } from '@angular/core';
import { CartService } from '../../../../../core/cart/cart.service';
import { CATEGORY_LABELS, type Gender, type Product } from '../../../../data/product.model';

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

  readonly product = input.required<Product>();

  protected readonly categoryLabel = computed(() => CATEGORY_LABELS[this.product().category]);

  protected readonly genderLabel = computed(() => {
    const gender = this.product().gender;
    return gender ? GENDER_LABELS[gender] : undefined;
  });

  protected readonly hasQuickFacts = computed(() => {
    const product = this.product();
    return Boolean(product.year || product.origin || product.gender);
  });

  protected readonly starFills = computed(() => {
    const rating = this.product().rating ?? 0;
    return [1, 2, 3, 4, 5].map((step) => Math.min(100, Math.max(0, (rating - (step - 1)) * 100)));
  });

  protected readonly description = computed(() => {
    const notes = this.product().notes;
    if (notes.length === 0) {
      return '';
    }
    const list =
      notes.length === 1
        ? notes[0]
        : `${notes.slice(0, -1).join(', ')} y ${notes[notes.length - 1]}`;
    return `Una composición que combina ${list}.`;
  });

  protected readonly quantity = signal(1);

  protected readonly inCartQuantity = computed(() =>
    this.cartService.getQuantity(this.product().id),
  );
  protected readonly remainingStock = computed(() =>
    Math.max(0, this.product().stock - this.inCartQuantity()),
  );
  protected readonly isOutOfStock = computed(
    () => !this.product().isActive || this.remainingStock() === 0,
  );
  protected readonly cartError = signal<string | null>(null);
  protected readonly adding = signal(false);

  protected decreaseQuantity(): void {
    this.quantity.update((value) => Math.max(1, value - 1));
  }

  protected increaseQuantity(): void {
    this.quantity.update((value) => Math.min(this.remainingStock() || 1, value + 1));
  }

  protected async addToCart(): Promise<void> {
    if (this.isOutOfStock() || this.adding()) return;

    this.adding.set(true);
    this.cartError.set(null);
    const quantityToAdd = Math.min(this.quantity(), this.remainingStock());
    const result = await this.cartService.add(this.product(), quantityToAdd);
    this.adding.set(false);

    if (result.success) {
      this.quantity.set(1);
    } else {
      this.cartError.set(result.message ?? 'No pudimos agregar el producto al carrito');
    }
  }
}
