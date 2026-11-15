import {
  Component,
  DOCUMENT,
  afterNextRender,
  computed,
  debounced,
  effect,
  inject,
  signal,
  untracked,
  type OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { skip } from 'rxjs';
import {
  SHARE_CODE_PARAM,
  copyToClipboard,
  describeFilters,
  filtersFromShareParams,
  filtersToShareParams,
  hasActiveFilters,
} from '../../data/shared-filters';
import { SharedFiltersApi } from '../../data/shared-filters-api';
import {
  ProductsService,
  PRODUCTS_PAGE_SIZE,
  type ProductsQuery,
  type ProductsSortField,
} from '../../data/products.service';
import { ViewportScroller } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductsFiltersStore, type ProductsFiltersSnapshot } from '../../data/products-filters-store';
import {
  keepsStylesOnCategoryChange,
  styleGroupForCategory,
  styleGroupOfSelection,
  styleOptionsForGroup,
} from '../../data/style-group';
import {
  brandGroupKey,
  capacitySuffixFor,
  capacityUnitForCategory,
  showsGenderFilter,
} from '../../data/catalog-filter-groups';
import type {
  Gender,
  Product,
  ProductCategory,
  ProductStyle,
  SortOption,
} from '../../data/product.model';
import { ProductsHeader } from './components/products-header/products-header';
import { ProductsFilters, type FilterOption } from './components/products-filters/products-filters';
import { ProductsSidebar } from './components/products-sidebar/products-sidebar';
import { ProductsGrid } from './components/products-grid/products-grid';

@Component({
  selector: 'app-products',
  imports: [ProductsHeader, ProductsSidebar, ProductsFilters, ProductsGrid],
  templateUrl: './products.html',
  styleUrl: './products.css',
})
export default class Products implements OnDestroy {
  private readonly productsService = inject(ProductsService);
  private readonly filtersStore = inject(ProductsFiltersStore);
  private readonly viewportScroller = inject(ViewportScroller);

  protected readonly categories: readonly FilterOption<ProductCategory | 'todos'>[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'perfumes', label: 'Perfumes' },
    { id: 'decants', label: 'Decants' },
    { id: 'vapes', label: 'Vapes' },
    { id: 'esencias', label: 'Esencias' },
  ];

  protected readonly sortOptions: readonly FilterOption<SortOption>[] = [
    { id: 'destacados', label: 'Destacados' },
    { id: 'precio-asc', label: 'Precio: menor a mayor' },
    { id: 'precio-desc', label: 'Precio: mayor a menor' },
    { id: 'nombre', label: 'Nombre A-Z' },
  ];

  protected readonly genderOptions: readonly FilterOption<Gender | 'todos'>[] = [
    { id: 'todos', label: 'Todos los géneros' },
    { id: 'masculino', label: 'Masculino' },
    { id: 'femenino', label: 'Femenino' },
    { id: 'unisex', label: 'Unisex' },
  ];

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  private readonly sharedFiltersApi = inject(SharedFiltersApi);

  /** Filtros de un link compartido, o `null` si no se entró desde uno. Tienen prioridad sobre
   *  los guardados. El link corto (`?c=<código>`) ya llega resuelto por `sharedFiltersResolver`;
   *  el largo (`?categoria=...`) se lee de la URL. */
  private readonly sharedFilters =
    (this.route.snapshot.data['sharedFilters'] as ProductsFiltersSnapshot | null | undefined) ??
    filtersFromShareParams(this.route.snapshot.queryParamMap);

  /** Hay algo de un link compartido en la URL para limpiar (incluido un código que ya no existe). */
  private readonly enteredFromShareLink =
    this.sharedFilters !== null || this.route.snapshot.queryParamMap.has(SHARE_CODE_PARAM);

  /** Read once on load. Los filtros viven en sessionStorage, no en la URL: un link compartido
   *  solo los trae de entrada, y la URL se limpia apenas se aplican. */
  private readonly initialFilters = this.sharedFilters ?? this.filtersStore.read();

  /** "¡Link copiado!" en el botón Compartir, por unos segundos. */
  protected readonly linkCopied = signal(false);
  private linkCopiedTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly search = signal(this.initialFilters.term);
  protected readonly activeCategory = signal<ProductCategory | 'todos'>(this.initialFilters.category);
  protected readonly activeBrand = signal<string | 'todas'>(this.initialFilters.brand);
  protected readonly activeGender = signal<Gender | 'todos'>(this.initialFilters.gender);
  protected readonly sortBy = signal<SortOption>(this.initialFilters.sort);
  protected readonly activeStyles = signal<ReadonlySet<ProductStyle>>(
    new Set(this.initialFilters.styles),
  );
  /** Fragrance pills for perfumes/decants, flavor pills for vapes/esencias, none for "todos". */
  protected readonly styleOptions = computed(() =>
    styleOptionsForGroup(styleGroupForCategory(this.activeCategory())),
  );
  /** Not a signal on purpose - only read inside the effect below to detect a real group change. */
  private lastStyleGroup = styleGroupForCategory(this.initialFilters.category);
  /** Vocabulario de los estilos ELEGIDOS (no de la categoría actual): con el buscador del home,
   *  la categoría es "Todos" pero los estilos son de fragancias. Decide si sobreviven a un cambio
   *  de categoría (ver `keepsStylesOnCategoryChange`). */
  private stylesGroup = styleGroupOfSelection(this.initialFilters.category, this.initialFilters.styles);
  protected readonly activeCapacity = signal<number | 'todas'>(
    this.initialFilters.capacityMl ?? 'todas',
  );
  /** Not a signal on purpose - same "detect a real change" role as `lastStyleGroup` above. */
  private lastCapacityUnit = capacityUnitForCategory(this.initialFilters.category);
  private lastBrandGroup = brandGroupKey(this.initialFilters.category);
  private readonly capacitiesResource = this.productsService.capacities(() => {
    const category = this.activeCategory();
    return category === 'todos' ? undefined : category;
  });
  protected readonly capacityOptions = this.capacitiesResource.value;
  /** Perfumes/decants comparten marcas; vapes y esencias tienen cada uno el suyo propio - ver
   *  `brandCategoriesFor` en el backend. */
  private readonly brandsResource = this.productsService.brands(() => {
    const category = this.activeCategory();
    return category === 'todos' ? undefined : category;
  });
  protected readonly brandOptions = this.brandsResource.value;
  /** "Todos" no tiene una unidad única (ml vs. puffs) - el filtro de Capacidad se oculta por
   *  completo hasta elegir una categoría puntual (`capacityOptions()` queda vacío igual). */
  protected readonly showGender = computed(() => showsGenderFilter(this.activeCategory()));
  protected readonly capacitySuffix = computed(() => {
    const unit = capacityUnitForCategory(this.activeCategory());
    return unit ? capacitySuffixFor(unit) : 'ml';
  });

  private readonly debouncedSearch = debounced(this.search, 300);
  private readonly offset = signal(0);

  private readonly productsResource = this.productsService.list(() => ({
    ...this.buildFilters(),
    limit: PRODUCTS_PAGE_SIZE,
    offset: this.offset(),
  }));

  protected readonly items = signal<Product[]>([]);
  protected readonly total = signal(0);

  protected readonly isLoading = this.productsResource.isLoading;
  protected readonly hasMore = computed(() => this.items().length < this.total());

  constructor() {
    this.filtersStore.applied$
      .pipe(takeUntilDestroyed())
      .subscribe((snapshot) => this.applySnapshot(snapshot));

    // Entrada desde un link compartido: los filtros ya se tomaron arriba (`initialFilters`). La
    // URL se limpia después del primer render, cuando la navegación de entrada ya terminó.
    if (this.enteredFromShareLink) {
      afterNextRender(() => this.clearShareParams());
    }
    // Un link compartido abierto estando ya en el catálogo (misma página, otra URL). El corto
    // llega resuelto por el resolver (`data`), el largo en los parámetros.
    this.route.data.pipe(skip(1), takeUntilDestroyed()).subscribe((data) => {
      const shared = data['sharedFilters'] as ProductsFiltersSnapshot | null | undefined;
      if (shared) this.applySnapshot(shared);
    });
    this.route.queryParamMap.pipe(skip(1), takeUntilDestroyed()).subscribe((params) => {
      const longLink = filtersFromShareParams(params);
      if (longLink) this.applySnapshot(longLink);
      if (longLink || params.has(SHARE_CODE_PARAM)) this.clearShareParams();
    });

    // Fragrance styles don't apply to vapes/esencias (and vice versa) - switching into a
    // different style group drops whatever was selected under the previous one, so a stale
    // filter from the other vocabulary never silently keeps narrowing the results.
    // Los estilos elegidos se mantienen mientras la categoría use su mismo vocabulario (perfumes ↔
    // decants, o de "Todos" con los del buscador del home a perfumes/decants) y se borran al pasar
    // al otro (vapes/esencias) o al volver a "Todos".
    effect(() => {
      const category = this.activeCategory();
      const group = styleGroupForCategory(category);
      untracked(() => {
        if (group === this.lastStyleGroup) return;
        this.lastStyleGroup = group;
        // Solo si había alguno elegido: un `Set` vacío nuevo igual cuenta como cambio y disparaba
        // un segundo pedido idéntico al catálogo en cada cambio de categoría (cancelando el
        // primero, que el servidor igual pudo haber procesado).
        if (this.activeStyles().size === 0) return;
        if (keepsStylesOnCategoryChange(this.stylesGroup, category)) return;
        this.activeStyles.set(new Set());
      });
    });

    // Una marca elegida en perfumes/decants no necesariamente existe en vapes/esencias (cada uno
    // tiene su propio universo de marcas) - se limpia al cruzar de grupo, mismo criterio que los
    // estilos arriba.
    effect(() => {
      const group = brandGroupKey(this.activeCategory());
      untracked(() => {
        if (group === this.lastBrandGroup) return;
        this.lastBrandGroup = group;
        this.activeBrand.set('todas');
      });
    });

    // La capacidad elegida deja de tener sentido al cambiar de unidad (ml vs. puffs, o al volver
    // a "todos", que no tiene una unidad única) - mismo criterio que los estilos arriba.
    effect(() => {
      const unit = capacityUnitForCategory(this.activeCategory());
      untracked(() => {
        if (unit === this.lastCapacityUnit) return;
        this.lastCapacityUnit = unit;
        this.activeCapacity.set('todas');
      });
    });

    // El género no aplica a vapes/esencias - se limpia al entrar a una categoría donde el
    // filtro ya no se muestra, para que no siga acotando resultados sin que se vea el control.
    effect(() => {
      const shows = showsGenderFilter(this.activeCategory());
      untracked(() => {
        if (shows || this.activeGender() === 'todos') return;
        this.activeGender.set('todos');
      });
    });

    // Reacts only to filter changes (not to `offset`) and resets pagination back to page one.
    effect(() => {
      this.buildFilters();
      untracked(() => {
        this.offset.set(0);
        this.items.set([]);
      });
    });

    // Reacts to each resolved page and appends it, unless it's a fresh first page.
    effect(() => {
      const page = this.productsResource.value();
      const isFirstPage = untracked(() => this.offset()) === 0;
      this.items.set(isFirstPage ? page.data : [...untracked(() => this.items()), ...page.data]);
      this.total.set(page.pagination.total);
    });

    // Persists every filter change to sessionStorage - a refresh (or navigating away and back)
    // keeps whatever was last applied, since none of this ever reaches the URL.
    effect(() => {
      this.filtersStore.write(this.currentFilters());
    });
  }

  private currentFilters(): ProductsFiltersSnapshot {
    const capacity = this.activeCapacity();
    return {
      term: this.search(),
      category: this.activeCategory(),
      brand: this.activeBrand(),
      gender: this.activeGender(),
      sort: this.sortBy(),
      styles: Array.from(this.activeStyles()),
      capacityMl: capacity === 'todas' ? null : capacity,
    };
  }

  /**
   * Mouse encima, foco o dedo apoyado sobre Compartir: se pide el código ya. Así, al soltar, el
   * link corto suele estar listo y el menú de compartir del celular se abre sin esperar (el
   * navegador solo lo permite inmediatamente después de un toque).
   */
  protected prepareShare(): void {
    const filters = this.currentFilters();
    if (hasActiveFilters(filters)) void this.sharedFiltersApi.codeFor(filters).catch(() => undefined);
  }

  /**
   * Botón Compartir: un link corto (`/productos?c=k7Qx2m`) que abre el catálogo con estos mismos
   * filtros. En el celular abre el menú de compartir del sistema (WhatsApp, etc.); en la
   * computadora lo copia. Si el servidor no da el código, se comparte el link largo, que también
   * funciona.
   */
  protected async shareFilters(): Promise<void> {
    const filters = this.currentFilters();
    const url = await this.shareUrlFor(filters);
    const view = this.document.defaultView;

    if (view && typeof view.navigator.share === 'function' && view.matchMedia?.('(pointer: coarse)')?.matches) {
      try {
        await view.navigator.share({ title: 'Essence Vapes', text: describeFilters(filters), url });
        return;
      } catch (error) {
        // Cerró el menú sin compartir: no hay nada más que hacer. Otro error: se copia el link.
        if ((error as { name?: string } | null)?.name === 'AbortError') return;
      }
    }

    if (await copyToClipboard(url, this.document)) {
      this.linkCopied.set(true);
      clearTimeout(this.linkCopiedTimer);
      this.linkCopiedTimer = setTimeout(() => this.linkCopied.set(false), 2500);
    } else {
      // Último recurso: el link queda seleccionado en un cuadro para copiarlo a mano.
      view?.prompt('Copiá este link para compartir:', url);
    }
  }

  /** El link a compartir: corto si hay código (ya listo o pedido ahora), largo si el servidor
   *  falla, y `/productos` a secas si no hay filtros. */
  private async shareUrlFor(filters: ProductsFiltersSnapshot): Promise<string> {
    const toUrl = (queryParams: Record<string, string>) =>
      `${this.document.location.origin}${this.router.serializeUrl(
        this.router.createUrlTree(['/productos'], { queryParams }),
      )}`;

    if (!hasActiveFilters(filters)) return toUrl({});
    const ready = this.sharedFiltersApi.peekCode(filters);
    if (ready) return toUrl({ [SHARE_CODE_PARAM]: ready });
    try {
      return toUrl({ [SHARE_CODE_PARAM]: await this.sharedFiltersApi.codeFor(filters) });
    } catch {
      return toUrl(filtersToShareParams(filters));
    }
  }

  /** Saca los parámetros del link compartido de la URL (quedan aplicados y guardados). */
  private clearShareParams(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  /** Filtros que llegan de afuera con la página ya abierta (ej. "Perfumes" en el footer estando
   *  en el catálogo): se aplican todos de una y se vuelve arriba, a los resultados. */
  private applySnapshot(snapshot: ProductsFiltersSnapshot): void {
    // El snapshot manda: los effects de "cambió el grupo de la categoría" no deben limpiar lo que
    // trae (ej. estilos del buscador del home sobre "Todos").
    this.lastStyleGroup = styleGroupForCategory(snapshot.category);
    this.lastBrandGroup = brandGroupKey(snapshot.category);
    this.lastCapacityUnit = capacityUnitForCategory(snapshot.category);
    this.stylesGroup = styleGroupOfSelection(snapshot.category, snapshot.styles);
    this.search.set(snapshot.term);
    this.activeCategory.set(snapshot.category);
    this.activeBrand.set(snapshot.brand);
    this.activeGender.set(snapshot.gender);
    this.sortBy.set(snapshot.sort);
    this.activeStyles.set(new Set(snapshot.styles));
    this.activeCapacity.set(snapshot.capacityMl ?? 'todas');
    this.viewportScroller.scrollToPosition([0, 0]);
  }

  /** Salir de la página reinicia los filtros, salvo que se vaya a ver un producto: al volver
   *  atrás se sigue viendo lo mismo. Un refresh estando acá también los conserva. */
  ngOnDestroy(): void {
    clearTimeout(this.linkCopiedTimer);
    this.filtersStore.leaveCatalog();
  }

  protected loadMore(): void {
    if (!this.hasMore() || this.isLoading()) {
      return;
    }
    this.offset.update((value) => value + PRODUCTS_PAGE_SIZE);
  }

  protected toggleStyle(style: ProductStyle): void {
    // Los botones de estilo solo se ven en perfumes/decants o vapes/esencias: lo que se elige acá
    // es del vocabulario de la categoría actual.
    this.stylesGroup = styleGroupForCategory(this.activeCategory());
    this.activeStyles.update((current) => {
      const next = new Set(current);
      if (next.has(style)) {
        next.delete(style);
      } else {
        next.add(style);
      }
      return next;
    });
  }

  protected clearStyles(): void {
    this.activeStyles.set(new Set());
  }

  private buildFilters(): ProductsQuery {
    const term = this.debouncedSearch.value().trim();
    const category = this.activeCategory();
    const brand = this.activeBrand();
    const gender = this.activeGender();
    const styles = this.activeStyles();
    const capacity = this.activeCapacity();

    return {
      term: term.length > 0 ? term : undefined,
      category: category === 'todos' ? undefined : category,
      brand: brand === 'todas' ? undefined : brand,
      gender: gender === 'todos' ? undefined : gender,
      styles: styles.size > 0 ? Array.from(styles) : undefined,
      capacityMl: capacity === 'todas' ? undefined : [capacity],
      ...this.sortParams(this.sortBy()),
    };
  }

  private sortParams(sort: SortOption): { sort: ProductsSortField; order: 'asc' | 'desc' } {
    switch (sort) {
      case 'precio-asc':
        return { sort: 'priceValue', order: 'asc' };
      case 'precio-desc':
        return { sort: 'priceValue', order: 'desc' };
      case 'nombre':
        return { sort: 'name', order: 'asc' };
      default:
        return { sort: 'featured', order: 'desc' };
    }
  }
}
