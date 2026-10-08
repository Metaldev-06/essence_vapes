import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormField, form, max, min, required, schema } from '@angular/forms/signals';

import { extractErrorMessage } from '../../data/extract-error-message';
import type { AdminProductInput } from '../../data/admin-product.model';
import { ProductsAdminService } from '../../data/products-admin.service';
import { SCENT_STYLE_OPTIONS } from '../../../ecommerce/data/scent-styles';
import { ACCENT_VARS } from '../../../ecommerce/data/accent';
import {
  CATEGORY_LABELS,
  type AccentKey,
  type Gender,
  type Longevity,
  type Product,
  type ProductCategory,
  type ScentStyle,
  type Sillage,
} from '../../../ecommerce/data/product.model';
import { MediaManager } from './components/media-manager/media-manager';
import { ToggleSwitch } from '../../shared/toggle-switch/toggle-switch';

const SAVED_MESSAGE_DURATION_MS = 4000;

const ACCENT_LABELS: Record<AccentKey, string> = {
  violet: 'Violeta',
  cyan: 'Cian',
  emerald: 'Esmeralda',
  teal: 'Verde agua',
};

const GENDER_LABELS: Record<Gender, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  unisex: 'Unisex',
};

const SILLAGE_LABELS: Record<Sillage, string> = {
  intimo: 'Íntimo',
  moderado: 'Moderado',
  fuerte: 'Fuerte',
  enorme: 'Enorme',
};

interface ProductFormModel {
  brand: string;
  name: string;
  subtitle: string;
  notesText: string;
  priceValue: number | null;
  oldPriceValue: number | null;
  badge: string;
  accent: AccentKey | '';
  category: ProductCategory | '';
  featured: boolean;
  year: number | null;
  origin: string;
  gender: Gender | '';
  rating: number | null;
  ratingCount: number | null;
  accordsText: string;
  topText: string;
  heartText: string;
  baseText: string;
  moodText: string;
  seasonPrimavera: number | null;
  seasonVerano: number | null;
  seasonOtono: number | null;
  seasonInvierno: number | null;
  dayDia: number | null;
  dayNoche: number | null;
  occTrabajo: number | null;
  occRomantico: number | null;
  occSocial: number | null;
  occCasual: number | null;
  occFormal: number | null;
  occDeporte: number | null;
  sillage: Sillage | '';
  longevity: Longevity | '';
  stock: number | null;
  isActive: boolean;
}

function emptyModel(): ProductFormModel {
  return {
    brand: '',
    name: '',
    subtitle: '',
    notesText: '',
    priceValue: null,
    oldPriceValue: null,
    badge: '',
    accent: '',
    category: '',
    featured: false,
    year: null,
    origin: '',
    gender: '',
    rating: null,
    ratingCount: null,
    accordsText: '',
    topText: '',
    heartText: '',
    baseText: '',
    moodText: '',
    seasonPrimavera: null,
    seasonVerano: null,
    seasonOtono: null,
    seasonInvierno: null,
    dayDia: null,
    dayNoche: null,
    occTrabajo: null,
    occRomantico: null,
    occSocial: null,
    occCasual: null,
    occFormal: null,
    occDeporte: null,
    sillage: '',
    longevity: '',
    stock: 0,
    isActive: true,
  };
}

function joinList(values: readonly string[] | undefined): string {
  return (values ?? []).join(', ');
}

function parseList(text: string): string[] {
  return text
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function modelFromProduct(product: Product): ProductFormModel {
  return {
    brand: product.brand,
    name: product.name,
    subtitle: product.subtitle,
    notesText: joinList(product.notes),
    priceValue: product.priceValue,
    oldPriceValue: product.oldPriceValue ?? null,
    badge: product.badge ?? '',
    accent: product.accent,
    category: product.category,
    featured: product.featured ?? false,
    year: product.year ?? null,
    origin: product.origin ?? '',
    gender: product.gender ?? '',
    rating: product.rating ?? null,
    ratingCount: product.ratingCount ?? null,
    accordsText: joinList(product.accords),
    topText: joinList(product.fragranceNotes?.top),
    heartText: joinList(product.fragranceNotes?.heart),
    baseText: joinList(product.fragranceNotes?.base),
    moodText: joinList(product.mood),
    seasonPrimavera: product.seasonUsage?.primavera ?? null,
    seasonVerano: product.seasonUsage?.verano ?? null,
    seasonOtono: product.seasonUsage?.otono ?? null,
    seasonInvierno: product.seasonUsage?.invierno ?? null,
    dayDia: product.dayUsage?.dia ?? null,
    dayNoche: product.dayUsage?.noche ?? null,
    occTrabajo: product.occasions?.trabajo ?? null,
    occRomantico: product.occasions?.romantico ?? null,
    occSocial: product.occasions?.social ?? null,
    occCasual: product.occasions?.casual ?? null,
    occFormal: product.occasions?.formal ?? null,
    occDeporte: product.occasions?.deporte ?? null,
    sillage: product.sillage ?? '',
    longevity: product.longevity ?? '',
    stock: product.stock,
    isActive: product.isActive,
  };
}

function buildPayload(model: ProductFormModel, styles: ReadonlySet<ScentStyle>): AdminProductInput {
  const payload: AdminProductInput = {
    brand: model.brand.trim(),
    name: model.name.trim(),
    subtitle: model.subtitle.trim(),
    notes: parseList(model.notesText),
    priceValue: model.priceValue ?? 0,
    accent: model.accent as AccentKey,
    category: model.category as ProductCategory,
    styles: Array.from(styles),
    featured: model.featured,
    stock: model.stock ?? 0,
    isActive: model.isActive,
  };

  if (model.oldPriceValue) payload.oldPriceValue = model.oldPriceValue;
  if (model.badge.trim()) payload.badge = model.badge.trim();
  if (model.year) payload.year = model.year;
  if (model.origin.trim()) payload.origin = model.origin.trim();
  if (model.gender) payload.gender = model.gender as Gender;

  if (model.rating) {
    payload.rating = model.rating;
    payload.ratingCount = model.ratingCount ?? 0;
  }

  const accords = parseList(model.accordsText);
  if (accords.length > 0) payload.accords = accords;

  const top = parseList(model.topText);
  const heart = parseList(model.heartText);
  const base = parseList(model.baseText);
  if (top.length > 0 || heart.length > 0 || base.length > 0) {
    payload.fragranceNotes = { top, heart, base };
  }

  const mood = parseList(model.moodText);
  if (mood.length > 0) payload.mood = mood;

  payload.seasonUsage = {
    primavera: model.seasonPrimavera ?? 0,
    verano: model.seasonVerano ?? 0,
    otono: model.seasonOtono ?? 0,
    invierno: model.seasonInvierno ?? 0,
  };
  payload.dayUsage = {
    dia: model.dayDia ?? 0,
    noche: model.dayNoche ?? 0,
  };
  payload.occasions = {
    trabajo: model.occTrabajo ?? 0,
    romantico: model.occRomantico ?? 0,
    social: model.occSocial ?? 0,
    casual: model.occCasual ?? 0,
    formal: model.occFormal ?? 0,
    deporte: model.occDeporte ?? 0,
  };

  if (model.sillage) payload.sillage = model.sillage as Sillage;
  if (model.longevity) payload.longevity = model.longevity as Longevity;

  return payload;
}

// 0-5 rating fields (season/day/occasion usage) all share the same bounds and message.
const ratingFieldKeys = [
  'seasonPrimavera',
  'seasonVerano',
  'seasonOtono',
  'seasonInvierno',
  'dayDia',
  'dayNoche',
  'occTrabajo',
  'occRomantico',
  'occSocial',
  'occCasual',
  'occFormal',
  'occDeporte',
] as const;

const productSchema = schema<ProductFormModel>((path) => {
  required(path.brand, { message: 'La marca es obligatoria' });
  required(path.name, { message: 'El nombre es obligatorio' });
  required(path.subtitle, { message: 'El subtítulo es obligatorio' });
  required(path.notesText, { message: 'Ingresá al menos una nota' });

  required(path.priceValue, { message: 'El precio es obligatorio' });
  min(path.priceValue, 1, { message: 'El precio debe ser mayor a 0' });

  required(path.accent, { message: 'Elegí un color de acento' });
  required(path.category, { message: 'Elegí una categoría' });

  min(path.stock, 0, { message: 'El stock no puede ser negativo' });

  for (const key of ratingFieldKeys) {
    min(path[key], 0, { message: 'Debe estar entre 0 y 5' });
    max(path[key], 5, { message: 'Debe estar entre 0 y 5' });
  }

  min(path.rating, 0, { message: 'Debe estar entre 0 y 5' });
  max(path.rating, 5, { message: 'Debe estar entre 0 y 5' });

  min(path.oldPriceValue, 1, { message: 'Debe ser mayor a 0' });
  min(path.ratingCount, 0, { message: 'No puede ser negativo' });
});

/** Create AND edit share this one form - `id` coming from the route is the only difference. */
@Component({
  selector: 'app-admin-product-form',
  imports: [FormField, RouterLink, MediaManager, ToggleSwitch],
  templateUrl: './product-form.html',
  styleUrl: './product-form.css',
})
export default class ProductForm {
  private readonly productsAdminService = inject(ProductsAdminService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly styleOptions = SCENT_STYLE_OPTIONS;
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly accentLabels = ACCENT_LABELS;
  protected readonly accentVars = ACCENT_VARS;
  protected readonly genderLabels = GENDER_LABELS;
  protected readonly sillageLabels = SILLAGE_LABELS;
  protected readonly categoryOptions: readonly ProductCategory[] = [
    'perfumes',
    'decants',
    'vapes',
    'esencias',
  ];
  protected readonly accentOptions: readonly AccentKey[] = ['violet', 'cyan', 'emerald', 'teal'];
  protected readonly genderOptions: readonly Gender[] = ['masculino', 'femenino', 'unisex'];
  protected readonly sillageOptions: readonly Sillage[] = [
    'intimo',
    'moderado',
    'fuerte',
    'enorme',
  ];
  protected readonly longevityOptions: readonly Longevity[] = [
    '2-4h',
    '4-6h',
    '6-8h',
    '8-12h',
    '12h+',
  ];

  protected readonly productId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = this.productId !== null;

  private readonly model = signal<ProductFormModel>(emptyModel());
  protected readonly productForm = form(this.model, productSchema);
  protected readonly selectedStyles = signal<ReadonlySet<ScentStyle>>(new Set());

  protected readonly isLoading = signal(this.isEditMode);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loadedProduct = signal<Product | null>(null);
  protected readonly savedMessage = signal<string | null>(null);
  private savedTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly pageTitle = computed(() =>
    this.isEditMode ? 'Editar producto' : 'Nuevo producto',
  );

  constructor() {
    if (this.productId) {
      void this.loadProduct(this.productId);
    }
  }

  protected toggleStyle(style: ScentStyle): void {
    this.selectedStyles.update((current) => {
      const next = new Set(current);
      if (next.has(style)) {
        next.delete(style);
      } else {
        next.add(style);
      }
      return next;
    });
  }

  protected onMediaChanged(product: Product): void {
    this.loadedProduct.set(product);
  }

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.productForm().markAsTouched();
    if (!this.productForm().valid() || this.selectedStyles().size === 0) {
      this.error.set(
        this.selectedStyles().size === 0 && this.productForm().valid()
          ? 'Elegí al menos un estilo olfativo'
          : 'Revisá los campos marcados en rojo antes de guardar.',
      );
      this.focusFirstInvalidField();
      return;
    }

    const payload = buildPayload(this.model(), this.selectedStyles());

    this.isSaving.set(true);
    this.error.set(null);
    try {
      if (this.isEditMode && this.productId) {
        const updated = await this.productsAdminService.update(this.productId, payload);
        this.loadedProduct.set(updated);
        this.showSaved('Cambios guardados');
      } else {
        const created = await this.productsAdminService.create(payload);
        // Media can only be attached once the product exists - send them straight to edit mode.
        await this.router.navigate(['/admin/productos', created.id, 'editar']);
        return;
      }
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.isSaving.set(false);
    }
  }

  private showSaved(message: string): void {
    clearTimeout(this.savedTimer);
    this.savedMessage.set(message);
    this.savedTimer = setTimeout(() => this.savedMessage.set(null), SAVED_MESSAGE_DURATION_MS);
  }

  /** Moves focus to the first field flagged invalid so a long form doesn't fail silently off-screen. */
  private focusFirstInvalidField(): void {
    queueMicrotask(() => {
      document.querySelector<HTMLElement>('.product-form .invalid')?.focus();
    });
  }

  private async loadProduct(id: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const product = await this.productsAdminService.get(id);
      this.loadedProduct.set(product);
      this.model.set(modelFromProduct(product));
      this.selectedStyles.set(new Set(product.styles));
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}
