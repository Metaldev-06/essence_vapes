import { DatePipe } from '@angular/common';
import { Component, computed, debounced, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Product } from '../../../ecommerce/data/product.model';
import { extractErrorMessage } from '../../data/extract-error-message';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  type DigestFrequency,
  type EventPreference,
  type GlobalNotificationSettings,
  type PersonalNotificationSettings,
  type PushDevice,
  type StockThreshold,
} from '../../data/notifications-admin.model';
import { NotificationsAdminService } from '../../data/notifications-admin.service';
import { ProductsAdminService } from '../../data/products-admin.service';
import { PushNotificationsService } from '../../data/push-notifications.service';
import { minutesToTimeInput, timeInputToMinutes } from '../../data/relative-time.helper';
import { Toast, type ToastMessage } from '../../shared/toast/toast';
import { ToggleSwitch } from '../../shared/toggle-switch/toggle-switch';

type Channel = 'enabled' | 'inApp' | 'push' | 'email';

interface GlobalField {
  readonly key: keyof GlobalNotificationSettings;
  readonly label: string;
  readonly hint: string;
  readonly unit: string;
  readonly min: number;
  readonly max: number;
}

const GLOBAL_FIELDS: readonly GlobalField[] = [
  {
    key: 'lowStockThreshold',
    label: 'Umbral global de stock bajo',
    hint: 'Avisa cuando a un producto le quedan estas unidades o menos. Con 0 se desactiva.',
    unit: 'unidades',
    min: 0,
    max: 1000,
  },
  {
    key: 'pendingPreparationHours',
    label: 'Pedido pagado sin preparar',
    hint: 'Tiempo máximo que un pedido pagado puede seguir pendiente de preparación.',
    unit: 'horas',
    min: 1,
    max: 720,
  },
  {
    key: 'pendingDispatchHours',
    label: 'Pedido sin despachar o sin quedar listo',
    hint: 'Tiempo máximo desde el pago hasta el despacho o hasta estar listo para retirar.',
    unit: 'horas',
    min: 1,
    max: 720,
  },
  {
    key: 'unansweredHours',
    label: 'Consulta sin responder',
    hint: 'Tiempo máximo sin respuesta a un mensaje o a un trámite de arrepentimiento.',
    unit: 'horas',
    min: 1,
    max: 720,
  },
  {
    key: 'reorderReminderDays',
    label: 'Recordatorio de reposición',
    hint: 'Días que un producto puede estar sin stock antes de recordarte que hay que reponerlo.',
    unit: 'días',
    min: 1,
    max: 90,
  },
  {
    key: 'retentionDays',
    label: 'Conservar el historial',
    hint: 'Las notificaciones más viejas que esto se eliminan solas.',
    unit: 'días',
    min: 7,
    max: 730,
  },
];

const DIGEST_OPTIONS: readonly { id: DigestFrequency; label: string }[] = [
  { id: 'off', label: 'No enviar' },
  { id: 'daily', label: 'Todos los días' },
  { id: 'weekly', label: 'Una vez por semana (lunes)' },
];

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * `/admin/notificaciones/configuracion`. Tres ámbitos bien separados en la pantalla:
 *  - "Este dispositivo" y "Mis preferencias": solo del admin que está mirando.
 *  - "Reglas del negocio": compartidas por todos los administradores.
 */
@Component({
  selector: 'app-admin-notification-settings',
  imports: [RouterLink, DatePipe, ToggleSwitch, Toast],
  templateUrl: './notification-settings.html',
  styleUrl: './notification-settings.css',
})
export default class AdminNotificationSettings {
  private readonly api = inject(NotificationsAdminService);
  private readonly productsApi = inject(ProductsAdminService);
  protected readonly push = inject(PushNotificationsService);

  protected readonly categories = NOTIFICATION_CATEGORIES;
  protected readonly categoryLabels = NOTIFICATION_CATEGORY_LABELS;
  protected readonly globalFields = GLOBAL_FIELDS;
  protected readonly digestOptions = DIGEST_OPTIONS;
  protected readonly hours = HOURS;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly toast = signal<ToastMessage | null>(null);

  // --- Mis preferencias ---
  protected readonly events = signal<readonly EventPreference[]>([]);
  protected readonly personal = signal<PersonalNotificationSettings | null>(null);
  protected readonly serverChannels = signal({ push: false, email: false });
  protected readonly preferencesDirty = signal(false);
  protected readonly savingPreferences = signal(false);

  protected readonly eventGroups = computed(() =>
    this.categories
      .map((category) => ({
        category,
        label: this.categoryLabels[category],
        events: this.events().filter((event) => event.category === category),
      }))
      .filter((group) => group.events.length > 0),
  );

  protected readonly quietStart = computed(() => minutesToTimeInput(this.personal()?.quietHoursStart ?? 0));
  protected readonly quietEnd = computed(() => minutesToTimeInput(this.personal()?.quietHoursEnd ?? 0));

  // --- Reglas del negocio ---
  protected readonly global = signal<GlobalNotificationSettings | null>(null);
  protected readonly globalDirty = signal(false);
  protected readonly savingGlobal = signal(false);

  // --- Umbrales por producto ---
  protected readonly thresholds = signal<readonly StockThreshold[]>([]);
  protected readonly productSearch = signal('');
  private readonly debouncedProductSearch = debounced(this.productSearch, 300);
  protected readonly productResults = signal<readonly Product[]>([]);
  protected readonly searchingProducts = signal(false);
  protected readonly selectedProduct = signal<Product | null>(null);
  protected readonly selectedVariantId = signal('base');
  protected readonly newThreshold = signal(5);
  protected readonly savingThreshold = signal(false);

  // --- Push ---
  protected readonly devices = signal<readonly PushDevice[]>([]);
  protected readonly pushBusy = signal(false);
  protected readonly pushMessage = signal<string | null>(null);
  protected readonly thisDevice = computed(
    () => this.devices().find((device) => device.fingerprint === this.push.currentFingerprint()) ?? null,
  );

  constructor() {
    void this.load();

    effect(() => {
      const term = this.debouncedProductSearch.value().trim();
      untracked(() => void this.searchProducts(term));
    });
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const [view, thresholds, devices] = await Promise.all([
        this.api.getPreferences(),
        this.api.listStockThresholds(),
        this.api.listPushDevices(),
        // Solo LEE el estado del navegador: no pide permiso ni registra nada.
        this.push.refresh(),
      ]);
      this.events.set(view.events);
      this.personal.set(view.settings);
      this.global.set(view.global);
      this.serverChannels.set(view.channels);
      this.thresholds.set(thresholds);
      this.devices.set(devices);
      this.preferencesDirty.set(false);
      this.globalDirty.set(false);
    } catch (error) {
      this.loadError.set(extractErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  // --- Mis preferencias ---

  protected setChannel(type: string, channel: Channel, value: boolean): void {
    this.events.update((events) =>
      events.map((event) => (event.type === type ? { ...event, [channel]: value } : event)),
    );
    this.preferencesDirty.set(true);
  }

  protected patchPersonal(patch: Partial<PersonalNotificationSettings>): void {
    this.personal.update((current) => (current ? { ...current, ...patch } : current));
    this.preferencesDirty.set(true);
  }

  protected onQuietTimeChange(field: 'quietHoursStart' | 'quietHoursEnd', event: Event): void {
    const minutes = timeInputToMinutes((event.target as HTMLInputElement).value);
    if (minutes !== null) this.patchPersonal({ [field]: minutes });
  }

  protected onDigestFrequencyChange(event: Event): void {
    this.patchPersonal({ digestFrequency: (event.target as HTMLSelectElement).value as DigestFrequency });
  }

  protected onDigestHourChange(event: Event): void {
    this.patchPersonal({ digestHour: Number((event.target as HTMLSelectElement).value) });
  }

  protected async savePreferences(): Promise<void> {
    const personal = this.personal();
    if (!personal) return;
    this.savingPreferences.set(true);
    try {
      const view = await this.api.updatePreferences({
        ...personal,
        events: this.events().map(({ type, enabled, inApp, push, email }) => ({
          type,
          enabled,
          inApp,
          push,
          email,
        })),
      });
      this.events.set(view.events);
      this.personal.set(view.settings);
      this.preferencesDirty.set(false);
      this.toast.set({ message: 'Preferencias guardadas', tone: 'success' });
    } catch (error) {
      this.toast.set({ message: extractErrorMessage(error), tone: 'error' });
    } finally {
      this.savingPreferences.set(false);
    }
  }

  // --- Reglas del negocio ---

  protected onGlobalInput(field: GlobalField, event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(raw)) return;
    const value = Math.min(field.max, Math.max(field.min, Math.round(raw)));
    this.global.update((current) => (current ? { ...current, [field.key]: value } : current));
    this.globalDirty.set(true);
  }

  protected async saveGlobal(): Promise<void> {
    const global = this.global();
    if (!global) return;
    this.savingGlobal.set(true);
    try {
      this.global.set(await this.api.updateGlobalSettings(global));
      this.globalDirty.set(false);
      this.toast.set({ message: 'Reglas del negocio guardadas', tone: 'success' });
    } catch (error) {
      this.toast.set({ message: extractErrorMessage(error), tone: 'error' });
    } finally {
      this.savingGlobal.set(false);
    }
  }

  // --- Umbrales por producto ---

  protected onProductSearchInput(event: Event): void {
    this.productSearch.set((event.target as HTMLInputElement).value);
    this.selectedProduct.set(null);
  }

  private async searchProducts(term: string): Promise<void> {
    if (term.length < 2 || this.selectedProduct()) {
      this.productResults.set([]);
      return;
    }
    this.searchingProducts.set(true);
    try {
      const page = await this.productsApi.list({ term, limit: 6 });
      // Si mientras tanto el admin siguió escribiendo, este resultado ya es viejo.
      if (this.debouncedProductSearch.value().trim() === term) this.productResults.set(page.data);
    } catch {
      this.productResults.set([]);
    } finally {
      this.searchingProducts.set(false);
    }
  }

  protected pickProduct(product: Product): void {
    this.selectedProduct.set(product);
    this.selectedVariantId.set(product.variants[0]?.id ?? 'base');
    this.productSearch.set(`${product.brand} ${product.name}`);
    this.productResults.set([]);
  }

  protected onVariantChange(event: Event): void {
    this.selectedVariantId.set((event.target as HTMLSelectElement).value);
  }

  protected onNewThresholdInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) this.newThreshold.set(Math.min(1000, Math.max(0, Math.round(value))));
  }

  protected async addThreshold(): Promise<void> {
    const product = this.selectedProduct();
    if (!product) return;
    this.savingThreshold.set(true);
    try {
      this.thresholds.set(
        await this.api.setStockThreshold(product.id, this.selectedVariantId(), this.newThreshold()),
      );
      this.selectedProduct.set(null);
      this.productSearch.set('');
      this.toast.set({ message: 'Umbral guardado', tone: 'success' });
    } catch (error) {
      this.toast.set({ message: extractErrorMessage(error), tone: 'error' });
    } finally {
      this.savingThreshold.set(false);
    }
  }

  protected async removeThreshold(threshold: StockThreshold): Promise<void> {
    try {
      this.thresholds.set(await this.api.removeStockThreshold(threshold.productId, threshold.variantId));
      this.toast.set({ message: 'El producto volvió a usar el umbral global', tone: 'success' });
    } catch (error) {
      this.toast.set({ message: extractErrorMessage(error), tone: 'error' });
    }
  }

  // --- Push ---

  /** Único lugar del panel que pide el permiso del navegador - siempre desde este clic. */
  protected async enablePush(): Promise<void> {
    this.pushBusy.set(true);
    this.pushMessage.set(null);
    try {
      const result = await this.push.enable();
      if (!result.ok) {
        this.pushMessage.set(result.reason);
        return;
      }
      this.devices.set(await this.api.listPushDevices());
      this.toast.set({ message: 'Notificaciones push activadas en este dispositivo', tone: 'success' });
    } catch (error) {
      this.pushMessage.set(extractErrorMessage(error));
    } finally {
      this.pushBusy.set(false);
    }
  }

  protected async disablePush(): Promise<void> {
    this.pushBusy.set(true);
    this.pushMessage.set(null);
    try {
      await this.push.disable(this.thisDevice()?.id ?? null);
      this.devices.set(await this.api.listPushDevices());
      this.toast.set({ message: 'Notificaciones push desactivadas en este dispositivo', tone: 'success' });
    } catch (error) {
      this.pushMessage.set(extractErrorMessage(error));
    } finally {
      this.pushBusy.set(false);
    }
  }

  protected async removeDevice(device: PushDevice): Promise<void> {
    this.pushBusy.set(true);
    try {
      if (device.id === this.thisDevice()?.id) await this.push.disable(device.id);
      else await this.api.removePushDevice(device.id);
      this.devices.set(await this.api.listPushDevices());
      this.toast.set({ message: 'Dispositivo eliminado', tone: 'success' });
    } catch (error) {
      this.toast.set({ message: extractErrorMessage(error), tone: 'error' });
    } finally {
      this.pushBusy.set(false);
    }
  }

  protected async sendTestPush(): Promise<void> {
    this.pushBusy.set(true);
    try {
      const result = await this.api.sendTestPush();
      this.toast.set(
        result.delivered > 0
          ? { message: 'Enviamos una notificación de prueba a tus dispositivos', tone: 'success' }
          : { message: 'No se pudo entregar la prueba a ningún dispositivo', tone: 'error' },
      );
      this.devices.set(await this.api.listPushDevices());
    } catch (error) {
      this.toast.set({ message: extractErrorMessage(error), tone: 'error' });
    } finally {
      this.pushBusy.set(false);
    }
  }

  protected dismissToast(): void {
    this.toast.set(null);
  }
}
