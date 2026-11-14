import { Component, computed, debounced, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { extractErrorMessage } from '../../data/extract-error-message';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_PRIORITY_LABELS,
  type AdminNotification,
  type BulkNotificationAction,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationStatusFilter,
} from '../../data/notifications-admin.model';
import { NotificationsAdminService } from '../../data/notifications-admin.service';
import { NotificationsStore } from '../../data/notifications.store';
import { formatRelativeTime } from '../../data/relative-time.helper';
import { ConfirmDialog, type ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { NotificationIcon } from '../../shared/notification-icon/notification-icon';
import { Toast, type ToastMessage } from '../../shared/toast/toast';

const PAGE_SIZE = 20;

const STATUS_TABS: readonly { id: NotificationStatusFilter; label: string }[] = [
  { id: 'active', label: 'Todas' },
  { id: 'unread', label: 'Sin leer' },
  { id: 'read', label: 'Leídas' },
  { id: 'archived', label: 'Archivadas' },
];

/** Día local de Argentina (`YYYY-MM-DD`) -> instante ISO, para que "desde el 14" signifique el
 *  14 de acá y no el 14 en UTC. Argentina no tiene horario de verano: el offset es fijo. */
const startOfDay = (date: string): string => `${date}T00:00:00.000-03:00`;
const endOfDay = (date: string): string => `${date}T23:59:59.999-03:00`;

const fullDateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * `/admin/notificaciones` - historial completo, con filtros, búsqueda y acciones masivas. Se
 * recarga solo cuando el store avisa que algo cambió (llegó una notificación, o se marcó algo
 * desde otra pestaña), así nunca muestra una lista vieja.
 */
@Component({
  selector: 'app-admin-notifications',
  imports: [RouterLink, NotificationIcon, EmptyState, ConfirmDialog, Toast],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export default class AdminNotifications {
  private readonly api = inject(NotificationsAdminService);
  private readonly router = inject(Router);
  protected readonly store = inject(NotificationsStore);

  protected readonly statusTabs = STATUS_TABS;
  protected readonly categories = NOTIFICATION_CATEGORIES;
  protected readonly categoryLabels = NOTIFICATION_CATEGORY_LABELS;
  protected readonly priorities = NOTIFICATION_PRIORITIES;
  protected readonly priorityLabels = NOTIFICATION_PRIORITY_LABELS;

  protected readonly status = signal<NotificationStatusFilter>('active');
  protected readonly category = signal<NotificationCategory | ''>('');
  protected readonly priority = signal<NotificationPriority | ''>('');
  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');
  protected readonly search = signal('');
  protected readonly offset = signal(0);
  private readonly debouncedSearch = debounced(this.search, 300);

  protected readonly items = signal<readonly AdminNotification[]>([]);
  protected readonly total = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly hasLoadedOnce = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly toast = signal<ToastMessage | null>(null);

  protected readonly selectedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedCount = computed(() => this.selectedIds().size);
  protected readonly allSelected = computed(
    () => this.items().length > 0 && this.items().every((item) => this.selectedIds().has(item.id)),
  );

  protected readonly page = computed(() => Math.floor(this.offset() / PAGE_SIZE) + 1);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly hasPrev = computed(() => this.offset() > 0);
  protected readonly hasNext = computed(() => this.offset() + PAGE_SIZE < this.total());

  protected readonly hasFilters = computed(
    () =>
      this.category() !== '' ||
      this.priority() !== '' ||
      this.dateFrom() !== '' ||
      this.dateTo() !== '' ||
      this.search().trim() !== '',
  );

  protected readonly emptyTitle = computed(() => {
    if (this.hasFilters()) return 'Nada coincide con estos filtros';
    if (this.status() === 'archived') return 'No hay notificaciones archivadas';
    if (this.status() === 'unread') return 'No tenés nada sin leer';
    if (this.status() === 'read') return 'No hay notificaciones leídas';
    return 'Todavía no hay notificaciones';
  });

  protected readonly emptyMessage = computed(() =>
    this.hasFilters()
      ? 'Probá con otra búsqueda o quitá algún filtro.'
      : 'Los pedidos pagados, las alertas de stock y todo lo que necesite tu atención van a aparecer acá.',
  );

  private readonly now = signal(Date.now());
  protected readonly rows = computed(() => {
    const now = this.now();
    return this.items().map((notification) => ({
      notification,
      relativeTime: formatRelativeTime(notification.createdAt, now),
      fullDate: fullDateFormatter.format(new Date(notification.createdAt)),
    }));
  });

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleteDialogData = computed<ConfirmDialogData>(() => ({
    title: 'Eliminar notificaciones',
    message: `¿Eliminar ${this.selectedCount()} ${
      this.selectedCount() === 1 ? 'notificación' : 'notificaciones'
    }? Esta acción no se puede deshacer.`,
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
    tone: 'danger',
  }));

  /** Descarta respuestas viejas si el admin cambió de filtro mientras otra carga seguía en vuelo. */
  private loadToken = 0;

  constructor() {
    // Cualquier cambio de filtro vuelve a la primera página.
    effect(() => {
      this.status();
      this.category();
      this.priority();
      this.dateFrom();
      this.dateTo();
      this.debouncedSearch.value();
      untracked(() => {
        this.offset.set(0);
        this.selectedIds.set(new Set());
      });
    });

    effect(() => {
      this.status();
      this.category();
      this.priority();
      this.dateFrom();
      this.dateTo();
      this.debouncedSearch.value();
      this.offset();
      // Llegó algo nuevo o cambió algo en otra pestaña: se recarga lo que hay en pantalla.
      this.store.revision();
      untracked(() => void this.load());
    });
  }

  protected async load(): Promise<void> {
    const token = ++this.loadToken;
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const dateFrom = this.dateFrom();
      const dateTo = this.dateTo();
      const page = await this.api.list({
        limit: PAGE_SIZE,
        offset: this.offset(),
        status: this.status(),
        category: this.category() || undefined,
        priority: this.priority() || undefined,
        dateFrom: dateFrom ? startOfDay(dateFrom) : undefined,
        dateTo: dateTo ? endOfDay(dateTo) : undefined,
        search: this.debouncedSearch.value().trim() || undefined,
      });
      if (token !== this.loadToken) return;

      this.items.set(page.data);
      this.total.set(page.pagination.total);
      this.now.set(Date.now());
      // Lo que ya no está en la página deja de estar seleccionado.
      const visible = new Set(page.data.map((item) => item.id));
      this.selectedIds.update((ids) => new Set([...ids].filter((id) => visible.has(id))));

      // Quedó parado en una página que ya no existe (se archivó lo último que había).
      if (page.data.length === 0 && this.offset() > 0) {
        this.offset.set(Math.max(0, (page.pagination.pages - 1) * PAGE_SIZE));
      }
    } catch (error) {
      if (token !== this.loadToken) return;
      this.error.set(extractErrorMessage(error));
    } finally {
      if (token === this.loadToken) {
        this.isLoading.set(false);
        this.hasLoadedOnce.set(true);
      }
    }
  }

  // --- Filtros ---

  protected setStatus(status: NotificationStatusFilter): void {
    this.status.set(status);
  }

  protected onCategoryChange(event: Event): void {
    this.category.set((event.target as HTMLSelectElement).value as NotificationCategory | '');
  }

  protected onPriorityChange(event: Event): void {
    this.priority.set((event.target as HTMLSelectElement).value as NotificationPriority | '');
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onDateFromChange(event: Event): void {
    this.dateFrom.set((event.target as HTMLInputElement).value);
  }

  protected onDateToChange(event: Event): void {
    this.dateTo.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.category.set('');
    this.priority.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.search.set('');
  }

  protected prevPage(): void {
    if (this.hasPrev()) this.offset.update((value) => Math.max(0, value - PAGE_SIZE));
  }

  protected nextPage(): void {
    if (this.hasNext()) this.offset.update((value) => value + PAGE_SIZE);
  }

  // --- Selección ---

  protected onSelectAllChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedIds.set(checked ? new Set(this.items().map((item) => item.id)) : new Set());
  }

  protected onRowSelectChange(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedIds.update((ids) => {
      const next = new Set(ids);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // --- Acciones ---

  protected open(notification: AdminNotification): void {
    if (!notification.read) void this.store.markRead(notification.id).catch(() => undefined);
    if (notification.resourceUrl) void this.router.navigateByUrl(notification.resourceUrl);
  }

  protected async toggleRead(notification: AdminNotification): Promise<void> {
    await this.run(() => this.store.markRead(notification.id, !notification.read));
  }

  protected async toggleArchived(notification: AdminNotification): Promise<void> {
    await this.run(
      async () => {
        await this.api.setArchived(notification.id, !notification.archived);
        await this.store.loadRecent();
      },
      notification.archived ? 'Notificación restaurada' : 'Notificación archivada',
    );
  }

  protected async markAllRead(): Promise<void> {
    await this.run(() => this.store.markAllRead(), 'Todas las notificaciones quedaron como leídas');
  }

  protected async bulk(action: BulkNotificationAction): Promise<void> {
    const ids = [...this.selectedIds()];
    if (ids.length === 0) return;
    await this.run(async () => {
      const updated = await this.store.bulk(ids, action);
      this.selectedIds.set(new Set());
      this.toast.set({
        message: `${updated} ${updated === 1 ? 'notificación actualizada' : 'notificaciones actualizadas'}`,
        tone: 'success',
      });
    });
  }

  protected askDelete(): void {
    if (this.selectedCount() > 0) this.deleteDialogOpen.set(true);
  }

  protected cancelDelete(): void {
    this.deleteDialogOpen.set(false);
  }

  protected async confirmDelete(): Promise<void> {
    this.deleteDialogOpen.set(false);
    await this.bulk('delete');
  }

  protected dismissToast(): void {
    this.toast.set(null);
  }

  /** Ejecuta una acción mostrando el error (si lo hay) y recargando la lista al terminar. */
  private async run(action: () => Promise<unknown>, successMessage?: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await action();
      if (successMessage) this.toast.set({ message: successMessage, tone: 'success' });
    } catch (error) {
      this.toast.set({ message: extractErrorMessage(error), tone: 'error' });
    } finally {
      this.busy.set(false);
      await this.load();
    }
  }
}
