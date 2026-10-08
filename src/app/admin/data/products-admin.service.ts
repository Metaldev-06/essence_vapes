import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';
import { IS_ADMIN_REQUEST } from '../../core/auth/admin-request.context';
import type { Product, ProductCategory } from '../../ecommerce/data/product.model';
import type { AdminProductInput } from './admin-product.model';

const ADMIN_CONTEXT = new HttpContext().set(IS_ADMIN_REQUEST, true);

export interface AdminProductsQuery {
  readonly term?: string;
  readonly category?: ProductCategory;
  readonly limit?: number;
  readonly offset?: number;
  readonly sort?: string;
  readonly order?: 'asc' | 'desc';
}

export interface AdminProductsPagination {
  readonly total: number;
  readonly pages: number;
  readonly current: number;
  readonly limit: number;
  readonly offset: number;
}

export interface AdminProductsPage {
  readonly data: Product[];
  readonly pagination: AdminProductsPagination;
}

/** All admin product operations, tagged so `adminAuthInterceptor` attaches the admin token. */
@Injectable({ providedIn: 'root' })
export class ProductsAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/products`;

  list(query: AdminProductsQuery): Promise<AdminProductsPage> {
    const params: Record<string, string | number> = {
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    };
    if (query.term) params['term'] = query.term;
    if (query.category) params['category'] = query.category;
    if (query.sort) params['sort'] = query.sort;
    if (query.order) params['order'] = query.order;

    return firstValueFrom(
      this.http.get<AdminProductsPage>(`${this.baseUrl}/admin/all`, {
        params,
        context: ADMIN_CONTEXT,
      }),
    );
  }

  get(id: string): Promise<Product> {
    return firstValueFrom(
      this.http.get<Product>(`${this.baseUrl}/${id}`, { context: ADMIN_CONTEXT }),
    );
  }

  create(input: AdminProductInput): Promise<Product> {
    return firstValueFrom(this.http.post<Product>(this.baseUrl, input, { context: ADMIN_CONTEXT }));
  }

  update(id: string, input: Partial<AdminProductInput>): Promise<Product> {
    return firstValueFrom(
      this.http.patch<Product>(`${this.baseUrl}/${id}`, input, { context: ADMIN_CONTEXT }),
    );
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/${id}`, { context: ADMIN_CONTEXT }),
    );
  }

  uploadImages(id: string, files: File[]): Promise<Product> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return firstValueFrom(
      this.http.post<Product>(`${this.baseUrl}/${id}/images`, formData, { context: ADMIN_CONTEXT }),
    );
  }

  removeImage(id: string, publicId: string): Promise<Product> {
    return firstValueFrom(
      this.http.delete<Product>(`${this.baseUrl}/${id}/images`, {
        params: { publicId },
        context: ADMIN_CONTEXT,
      }),
    );
  }

  uploadVideos(id: string, files: File[]): Promise<Product> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return firstValueFrom(
      this.http.post<Product>(`${this.baseUrl}/${id}/videos`, formData, { context: ADMIN_CONTEXT }),
    );
  }

  removeVideo(id: string, publicId: string): Promise<Product> {
    return firstValueFrom(
      this.http.delete<Product>(`${this.baseUrl}/${id}/videos`, {
        params: { publicId },
        context: ADMIN_CONTEXT,
      }),
    );
  }
}
