import { Injectable, Signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

import { API_BASE_URL } from '../../core/config/api.config';
import type { Product, ProductCategory, ScentStyle } from './product.model';

export type ProductsSortField = 'name' | 'brand' | 'priceValue' | 'rating' | 'year' | 'createdAt' | 'featured';

export interface ProductsQuery {
  readonly term?: string;
  readonly category?: ProductCategory;
  readonly styles?: readonly ScentStyle[];
  readonly sort?: ProductsSortField;
  readonly order?: 'asc' | 'desc';
  readonly limit?: number;
}

interface ProductsApiResponse {
  readonly data: Product[];
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly baseUrl = `${API_BASE_URL}/products`;

  private readonly featuredResource = httpResource<Product[]>(() => `${this.baseUrl}/featured`, {
    defaultValue: [],
  });

  readonly featured = this.featuredResource.value;
  readonly featuredLoading = this.featuredResource.isLoading;

  list(query: () => ProductsQuery | undefined) {
    return httpResource<Product[]>(
      () => {
        const value = query();
        if (!value) return undefined;
        return { url: this.baseUrl, params: this.toParams(value) };
      },
      { defaultValue: [], parse: (raw) => (raw as ProductsApiResponse).data },
    );
  }

  byId(id: Signal<string>) {
    return httpResource<Product>(() => (id() ? `${this.baseUrl}/${id()}` : undefined));
  }

  private toParams(query: ProductsQuery): Record<string, string | number> {
    const params: Record<string, string | number> = { limit: query.limit ?? 100 };
    if (query.term) params['term'] = query.term;
    if (query.category) params['category'] = query.category;
    if (query.styles && query.styles.length > 0) params['styles'] = query.styles.join(',');
    if (query.sort) params['sort'] = query.sort;
    if (query.order) params['order'] = query.order;
    return params;
  }
}
