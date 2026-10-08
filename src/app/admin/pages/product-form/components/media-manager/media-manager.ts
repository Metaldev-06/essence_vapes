import { Component, inject, input, output, signal } from '@angular/core';
import { extractErrorMessage } from '../../../../data/extract-error-message';
import { ProductsAdminService } from '../../../../data/products-admin.service';
import type { MediaAsset, Product } from '../../../../../ecommerce/data/product.model';

// Mirrors the backend's media.constants.ts so the UI can reject an obviously-bad
// selection before spending a round trip - the backend still re-validates regardless.
const MAX_IMAGES = 6;
const MAX_VIDEOS = 2;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024;

@Component({
  selector: 'app-media-manager',
  imports: [],
  templateUrl: './media-manager.html',
  styleUrl: './media-manager.css',
})
export class MediaManager {
  private readonly productsAdminService = inject(ProductsAdminService);

  readonly productId = input.required<string>();
  readonly images = input.required<readonly MediaAsset[]>();
  readonly videos = input.required<readonly MediaAsset[]>();

  readonly mediaChanged = output<Product>();

  protected readonly maxImages = MAX_IMAGES;
  protected readonly maxVideos = MAX_VIDEOS;
  protected readonly maxImageMb = MAX_IMAGE_SIZE_BYTES / (1024 * 1024);
  protected readonly maxVideoMb = MAX_VIDEO_SIZE_BYTES / (1024 * 1024);

  protected readonly uploadingImages = signal(false);
  protected readonly uploadingVideos = signal(false);
  protected readonly removingPublicId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected async onImagesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    if (this.images().length + files.length > this.maxImages) {
      this.error.set(`Un producto puede tener como máximo ${this.maxImages} imágenes`);
      return;
    }
    const tooBig = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (tooBig) {
      this.error.set(`"${tooBig.name}" supera los ${this.maxImageMb}MB permitidos`);
      return;
    }

    this.uploadingImages.set(true);
    this.error.set(null);
    try {
      const product = await this.productsAdminService.uploadImages(this.productId(), files);
      this.mediaChanged.emit(product);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.uploadingImages.set(false);
    }
  }

  protected async onVideosSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    if (this.videos().length + files.length > this.maxVideos) {
      this.error.set(`Un producto puede tener como máximo ${this.maxVideos} videos`);
      return;
    }
    const tooBig = files.find((file) => file.size > MAX_VIDEO_SIZE_BYTES);
    if (tooBig) {
      this.error.set(`"${tooBig.name}" supera los ${this.maxVideoMb}MB permitidos`);
      return;
    }

    this.uploadingVideos.set(true);
    this.error.set(null);
    try {
      const product = await this.productsAdminService.uploadVideos(this.productId(), files);
      this.mediaChanged.emit(product);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.uploadingVideos.set(false);
    }
  }

  protected async removeImage(publicId: string): Promise<void> {
    this.removingPublicId.set(publicId);
    this.error.set(null);
    try {
      const product = await this.productsAdminService.removeImage(this.productId(), publicId);
      this.mediaChanged.emit(product);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.removingPublicId.set(null);
    }
  }

  protected async removeVideo(publicId: string): Promise<void> {
    this.removingPublicId.set(publicId);
    this.error.set(null);
    try {
      const product = await this.productsAdminService.removeVideo(this.productId(), publicId);
      this.mediaChanged.emit(product);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.removingPublicId.set(null);
    }
  }
}
