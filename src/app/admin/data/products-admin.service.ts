import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';
import { IS_ADMIN_REQUEST } from '../../core/auth/admin-request.context';
import type { Product, ProductCategory } from '../../ecommerce/data/product.model';
import type { AdminProductInput, AdminVariantInput, AiLookupResult } from './admin-product.model';

const ADMIN_CONTEXT = new HttpContext().set(IS_ADMIN_REQUEST, true);

export interface AdminProductsQuery {
  readonly term?: string;
  readonly category?: ProductCategory;
  readonly brand?: string;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly minStock?: number;
  readonly maxStock?: number;
  readonly isActive?: boolean;
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

/** Ver `StockMovement` (backend) - ajuste manual de stock con motivo (punto 5.3). */
export interface StockMovementRecord {
  readonly id: string;
  readonly productId: string;
  readonly variantId: string;
  readonly quantityChange: number;
  readonly stockAfter: number;
  readonly reason: string;
  readonly adminEmail: string;
  readonly createdAt: string;
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
    if (query.brand) params['brand'] = query.brand;
    if (query.minPrice != null) params['minPrice'] = query.minPrice;
    if (query.maxPrice != null) params['maxPrice'] = query.maxPrice;
    if (query.minStock != null) params['minStock'] = query.minStock;
    if (query.maxStock != null) params['maxStock'] = query.maxStock;
    if (query.isActive != null) params['isActive'] = String(query.isActive);
    if (query.sort) params['sort'] = query.sort;
    if (query.order) params['order'] = query.order;

    return firstValueFrom(
      this.http.get<AdminProductsPage>(`${this.baseUrl}/admin/all`, {
        params,
        context: ADMIN_CONTEXT,
      }),
    );
  }

  /** Trae el producto CON el costo de adquisición incluido (ver tarea, punto 4.3) - distinto de
   *  la ruta pública que usa el storefront, que nunca lo expone. */
  get(id: string): Promise<Product> {
    return firstValueFrom(
      this.http.get<Product>(`${this.baseUrl}/${id}/admin`, { context: ADMIN_CONTEXT }),
    );
  }

  create(input: AdminProductInput): Promise<Product> {
    return firstValueFrom(this.http.post<Product>(this.baseUrl, input, { context: ADMIN_CONTEXT }));
  }

  /**
   * Busca en la web (DeepSeek + web_search/web_fetch) y sugiere datos para precargar el form.
   * Puede volver `status: 'ambiguous'` (ej. "Donna" vs "Uomo") en vez de una sugerencia: en ese
   * caso hay que volver a llamarla con el brand/name exacto de la candidata elegida.
   */
  aiLookup(brand: string, name: string): Promise<AiLookupResult> {
    return firstValueFrom(
      this.http.post<AiLookupResult>(
        `${this.baseUrl}/ai-lookup`,
        { brand, name },
        { context: ADMIN_CONTEXT },
      ),
    );
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

  /** Ajuste manual de stock con motivo (ver tarea, punto 5.3). */
  adjustStock(
    productId: string,
    variantId: string,
    quantityChange: number,
    reason: string,
  ): Promise<{ stockAfter: number }> {
    return firstValueFrom(
      this.http.post<{ stockAfter: number }>(
        `${this.baseUrl}/${productId}/stock-movements`,
        { variantId, quantityChange, reason },
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  getStockMovements(productId: string): Promise<StockMovementRecord[]> {
    return firstValueFrom(
      this.http.get<StockMovementRecord[]>(`${this.baseUrl}/${productId}/stock-movements`, {
        context: ADMIN_CONTEXT,
      }),
    );
  }

  /** Acciones masivas (ver tarea, punto 5.2) - solo manda los campos que realmente se quieren
   *  tocar. */
  bulkUpdate(
    ids: string[],
    changes: { isActive?: boolean; featured?: boolean; category?: ProductCategory },
  ): Promise<{ updated: number }> {
    return firstValueFrom(
      this.http.patch<{ updated: number }>(
        `${this.baseUrl}/admin/bulk`,
        { ids, ...changes },
        { context: ADMIN_CONTEXT },
      ),
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

  addVariant(productId: string, input: AdminVariantInput): Promise<Product> {
    return firstValueFrom(
      this.http.post<Product>(`${this.baseUrl}/${productId}/variants`, input, {
        context: ADMIN_CONTEXT,
      }),
    );
  }

  updateVariant(
    productId: string,
    variantId: string,
    input: Partial<AdminVariantInput>,
  ): Promise<Product> {
    return firstValueFrom(
      this.http.patch<Product>(
        `${this.baseUrl}/${productId}/variants/${variantId}`,
        input,
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  removeVariant(productId: string, variantId: string): Promise<Product> {
    return firstValueFrom(
      this.http.delete<Product>(`${this.baseUrl}/${productId}/variants/${variantId}`, {
        context: ADMIN_CONTEXT,
      }),
    );
  }

  uploadVariantImages(
    productId: string,
    variantId: string,
    files: File[],
  ): Promise<Product> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return firstValueFrom(
      this.http.post<Product>(
        `${this.baseUrl}/${productId}/variants/${variantId}/images`,
        formData,
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  removeVariantImage(
    productId: string,
    variantId: string,
    publicId: string,
  ): Promise<Product> {
    return firstValueFrom(
      this.http.delete<Product>(
        `${this.baseUrl}/${productId}/variants/${variantId}/images`,
        { params: { publicId }, context: ADMIN_CONTEXT },
      ),
    );
  }
}
