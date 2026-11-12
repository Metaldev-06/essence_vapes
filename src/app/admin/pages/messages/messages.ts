import {
  Component,
  DestroyRef,
  computed,
  debounced,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { extractErrorMessage } from '../../data/extract-error-message';
import { MessagesAdminService } from '../../data/messages-admin.service';
import { Toast, type ToastMessage } from '../../shared/toast/toast';
import { EmailBody } from './components/email-body/email-body';
import { ReplyEditor } from './components/reply-editor/reply-editor';
import {
  INBOX_LABELS,
  THREAD_PRIORITY_LABELS,
  THREAD_STATUS_LABELS,
  type CannedResponse,
  type ContactSummary,
  type InboxAddress,
  type InboxSignature,
  type InboxSummary,
  type MessageFolder,
  type MessagesStats,
  type MoveFolder,
  type RealtimeEvent,
  type StatsPeriod,
  type ThreadDetail,
  type ThreadPriority,
  type ThreadStatus,
  type ThreadSummary,
} from '../../data/messages-admin.model';

interface NavItem {
  readonly key: string;
  readonly label: string;
  readonly inbox?: InboxAddress;
  readonly folder?: MessageFolder;
  readonly unreadOnly?: boolean;
  readonly starredOnly?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { key: 'todas', label: 'Todas las bandejas', folder: 'inbox' },
  { key: 'contacto', label: 'Contacto', inbox: 'contacto', folder: 'inbox' },
  { key: 'ventas', label: 'Ventas', inbox: 'ventas', folder: 'inbox' },
  { key: 'soporte', label: 'Soporte', inbox: 'soporte', folder: 'inbox' },
  { key: 'no-leidos', label: 'No leídos', folder: 'inbox', unreadOnly: true },
  { key: 'destacados', label: 'Destacados', folder: 'inbox', starredOnly: true },
  { key: 'enviados', label: 'Enviados', folder: 'sent' },
  { key: 'archivados', label: 'Archivados', folder: 'archive' },
  { key: 'spam', label: 'Spam', folder: 'spam' },
  { key: 'papelera', label: 'Papelera', folder: 'trash' },
];

const STATUS_OPTIONS: readonly ThreadStatus[] = [
  'nuevo', 'pendiente', 'en_proceso', 'esperando_cliente', 'resuelto', 'cerrado',
];
const PRIORITY_OPTIONS: readonly ThreadPriority[] = ['baja', 'media', 'alta'];

@Component({
  selector: 'app-admin-messages',
  imports: [Toast, EmailBody, ReplyEditor, DatePipe, RouterLink],
  templateUrl: './messages.html',
  styleUrl: './messages.css',
})
export default class Messages {
  private readonly messagesAdminService = inject(MessagesAdminService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly navItems = NAV_ITEMS;
  protected readonly inboxLabels = INBOX_LABELS;
  protected readonly statusLabels = THREAD_STATUS_LABELS;
  protected readonly priorityLabels = THREAD_PRIORITY_LABELS;
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected readonly activeNavKey = signal('todas');
  protected readonly search = signal('');
  private readonly debouncedSearch = debounced(this.search, 350);

  protected readonly threads = signal<ThreadSummary[]>([]);
  protected readonly threadsLoading = signal(true);
  protected readonly threadsError = signal<string | null>(null);

  protected readonly selectedThreadId = signal<string | null>(null);
  protected readonly selectedInbox = signal<InboxAddress | null>(null);
  protected readonly threadDetail = signal<ThreadDetail | null>(null);
  protected readonly threadDetailLoading = signal(false);

  protected readonly mobileView = signal<'nav' | 'list' | 'detail'>('list');

  protected readonly inboxesSummary = signal<InboxSummary[]>([]);
  protected readonly totalUnread = computed(() =>
    this.inboxesSummary().reduce((sum, i) => sum + i.unread, 0),
  );

  protected readonly cannedResponses = signal<CannedResponse[]>([]);
  protected readonly signatures = signal<InboxSignature[]>([]);

  protected readonly stats = signal<MessagesStats | null>(null);
  protected readonly statsPeriod = signal<StatsPeriod>('7d');

  protected readonly contactSummary = signal<ContactSummary | null>(null);
  protected readonly contactPanelOpen = signal(false);
  protected readonly contactLoading = signal(false);

  protected readonly newNoteBody = signal('');
  protected readonly savingNote = signal(false);
  protected readonly savingState = signal(false);

  protected readonly toast = signal<ToastMessage | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly selectedSignatureBody = computed(() => {
    const inbox = this.selectedInbox();
    if (!inbox) return '';
    return this.signatures().find((s) => s.inbox === inbox)?.body ?? '';
  });

  constructor() {
    this.loadInboxesSummary();
    this.loadCannedResponses();
    this.loadSignatures();
    // No llama a `loadStats()` acá directo - el `effect()` de abajo ya corre una vez al crearse
    // el componente (comportamiento estándar de Angular signals), así que hacerlo también acá
    // disparaba 2 pedidos de stats (y sus ~9 llamadas a Resend cada uno) en el mismo instante.

    effect(() => {
      this.activeNavKey();
      this.debouncedSearch.value();
      untracked(() => void this.loadThreads());
    });

    effect(() => {
      const period = this.statsPeriod();
      untracked(() => void this.loadStats(period));
    });

    // `takeUntilDestroyed` es lo que realmente cierra la conexión SSE al salir de la página -
    // antes NO se cerraba sola (el comentario que decía eso era incorrecto): el teardown de
    // `watchEvents()` (que aborta el `fetch`) solo corre cuando algo llama `.unsubscribe()`, y acá
    // nada lo hacía. Cada visita a `/admin/mensajes` dejaba una conexión más abierta (confirmado
    // en la auditoría de performance, 2026-11-11 - ver `02-frontend-performance.md`).
    this.messagesAdminService
      .watchEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => this.onRealtimeEvent(event),
        error: () => {
          /* La conexión SSE se corta sola en algún momento (deploy, reinicio) - no hay retry
             automático en esta primera versión; recargar la página la reconecta. */
        },
      });
  }

  // --- Navegación / listado ---------------------------------------------------------------

  protected selectNav(key: string): void {
    this.activeNavKey.set(key);
    this.mobileView.set('list');
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatsPeriodChange(event: Event): void {
    this.statsPeriod.set((event.target as HTMLSelectElement).value as StatsPeriod);
  }

  protected onStatusChange(event: Event): void {
    void this.updateStatus((event.target as HTMLSelectElement).value as ThreadStatus);
  }

  protected onPriorityChange(event: Event): void {
    void this.updatePriority((event.target as HTMLSelectElement).value as ThreadPriority);
  }

  private get activeItem(): NavItem {
    return this.navItems.find((item) => item.key === this.activeNavKey()) ?? this.navItems[0];
  }

  private async loadThreads(): Promise<void> {
    this.threadsLoading.set(true);
    this.threadsError.set(null);
    try {
      const item = this.activeItem;
      const page = await this.messagesAdminService.listThreads({
        inbox: item.inbox,
        folder: item.folder,
        read: item.unreadOnly ? false : undefined,
        query: this.debouncedSearch.value().trim() || undefined,
        limit: 30,
      });
      const data = item.starredOnly ? page.data.filter((t) => t.starred) : page.data;
      this.threads.set([...data]);
    } catch (error) {
      this.threadsError.set(extractErrorMessage(error));
    } finally {
      this.threadsLoading.set(false);
    }
  }

  private async loadInboxesSummary(): Promise<void> {
    try {
      this.inboxesSummary.set(await this.messagesAdminService.listInboxes());
    } catch {
      /* El badge de no leídos simplemente no se actualiza - no bloquea el resto del panel. */
    }
  }

  private async loadCannedResponses(): Promise<void> {
    try {
      this.cannedResponses.set(await this.messagesAdminService.listCannedResponses());
    } catch {
      /* Sin respuestas rápidas disponibles por ahora - el editor sigue funcionando igual. */
    }
  }

  private async loadSignatures(): Promise<void> {
    try {
      this.signatures.set(await this.messagesAdminService.getSignatures());
    } catch {
      /* Sin firma disponible - el botón "Insertar firma" del editor simplemente no aparece. */
    }
  }

  private async loadStats(period: StatsPeriod = this.statsPeriod()): Promise<void> {
    try {
      this.stats.set(await this.messagesAdminService.getStats(period));
    } catch {
      /* El resumen del dashboard no es crítico - se deja vacío si falla. */
    }
  }

  // --- Conversación abierta -----------------------------------------------------------------

  protected async openThread(thread: ThreadSummary): Promise<void> {
    this.selectedThreadId.set(thread.id);
    this.selectedInbox.set(thread.inbox);
    this.mobileView.set('detail');
    this.threadDetailLoading.set(true);
    this.threadDetail.set(null);
    this.contactPanelOpen.set(false);
    this.contactSummary.set(null);
    try {
      const detail = await this.messagesAdminService.getThread(thread.inbox, thread.id);
      this.threadDetail.set(detail);
      if (!thread.read) {
        await this.messagesAdminService.setRead(thread.inbox, thread.id, true);
        this.patchThreadInList(thread.id, { read: true });
        void this.loadInboxesSummary();
      }
    } catch (error) {
      this.showToast(extractErrorMessage(error), 'error');
    } finally {
      this.threadDetailLoading.set(false);
    }
  }

  protected backToList(): void {
    this.mobileView.set('list');
  }

  protected async toggleContactPanel(fromHeader: string | null): Promise<void> {
    if (this.contactPanelOpen()) {
      this.contactPanelOpen.set(false);
      return;
    }
    const email = this.extractEmail(fromHeader);
    if (!email) return;

    this.contactPanelOpen.set(true);
    this.contactLoading.set(true);
    this.contactSummary.set(null);
    try {
      this.contactSummary.set(await this.messagesAdminService.getContact(email));
    } catch (error) {
      this.showToast(extractErrorMessage(error), 'error');
      this.contactPanelOpen.set(false);
    } finally {
      this.contactLoading.set(false);
    }
  }

  /** `"Steve Wozniak <steve@gmail.com>"` -> `"steve@gmail.com"` - también acepta un header sin
   *  nombre (`"steve@gmail.com"` solo). */
  private extractEmail(fromHeader: string | null): string | null {
    if (!fromHeader) return null;
    const match = /<([^>]+)>/.exec(fromHeader);
    return (match ? match[1] : fromHeader).trim() || null;
  }

  protected async onReplySent(): Promise<void> {
    const inbox = this.selectedInbox();
    const threadId = this.selectedThreadId();
    if (!inbox || !threadId) return;
    this.showToast('Respuesta enviada', 'success');
    const detail = await this.messagesAdminService.getThread(inbox, threadId);
    this.threadDetail.set(detail);
    void this.loadThreads();
  }

  protected async updateStatus(status: ThreadStatus): Promise<void> {
    await this.applyStateChange({ status });
  }

  protected async updatePriority(priority: ThreadPriority): Promise<void> {
    await this.applyStateChange({ priority });
  }

  protected async toggleStarred(): Promise<void> {
    const current = this.threadDetail();
    if (!current) return;
    await this.applyStateChange({ starred: !current.starred });
  }

  private async applyStateChange(changes: {
    status?: ThreadStatus;
    priority?: ThreadPriority;
    starred?: boolean;
  }): Promise<void> {
    const inbox = this.selectedInbox();
    const threadId = this.selectedThreadId();
    const current = this.threadDetail();
    if (!inbox || !threadId || !current) return;

    this.savingState.set(true);
    const previous = { status: current.status, priority: current.priority, starred: current.starred };
    this.threadDetail.set({ ...current, ...changes });
    try {
      await this.messagesAdminService.updateState(inbox, threadId, changes);
      if (changes.starred !== undefined) this.patchThreadInList(threadId, { starred: changes.starred });
    } catch (error) {
      this.threadDetail.set({ ...current, ...previous });
      this.showToast(extractErrorMessage(error), 'error');
    } finally {
      this.savingState.set(false);
    }
  }

  protected async moveToFolder(folder: MoveFolder): Promise<void> {
    const inbox = this.selectedInbox();
    const threadId = this.selectedThreadId();
    if (!inbox || !threadId) return;
    try {
      await this.messagesAdminService.moveToFolder(inbox, threadId, folder);
      this.showToast('Conversación movida', 'success');
      this.threads.update((list) => list.filter((t) => t.id !== threadId));
      this.mobileView.set('list');
    } catch (error) {
      this.showToast(extractErrorMessage(error), 'error');
    }
  }

  protected async addNote(): Promise<void> {
    const inbox = this.selectedInbox();
    const threadId = this.selectedThreadId();
    const body = this.newNoteBody().trim();
    if (!inbox || !threadId || !body) return;

    this.savingNote.set(true);
    try {
      await this.messagesAdminService.addNote(inbox, threadId, body);
      this.newNoteBody.set('');
      const detail = await this.messagesAdminService.getThread(inbox, threadId);
      this.threadDetail.set(detail);
    } catch (error) {
      this.showToast(extractErrorMessage(error), 'error');
    } finally {
      this.savingNote.set(false);
    }
  }

  protected onNoteInput(event: Event): void {
    this.newNoteBody.set((event.target as HTMLTextAreaElement).value);
  }

  // --- Tiempo real -----------------------------------------------------------------------

  private onRealtimeEvent(event: RealtimeEvent): void {
    if (event.type === 'thread.new_email') {
      this.showToast(`Nuevo correo en ${this.inboxLabels[event.inbox]}`, 'success');
      void this.loadThreads();
      void this.loadInboxesSummary();
    } else if (event.type === 'thread.updated') {
      if (this.selectedThreadId() === event.threadId) {
        void this.messagesAdminService
          .getThread(event.inbox, event.threadId)
          .then((detail) => this.threadDetail.set(detail));
      }
      void this.loadThreads();
    }
  }

  // --- Helpers -----------------------------------------------------------------------------

  private patchThreadInList(threadId: string, changes: Partial<ThreadSummary>): void {
    this.threads.update((list) =>
      list.map((t) => (t.id === threadId ? { ...t, ...changes } : t)),
    );
  }

  protected formatBytes(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected dismissToast(): void {
    clearTimeout(this.toastTimer);
    this.toast.set(null);
  }

  private showToast(message: string, tone: ToastMessage['tone']): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ message, tone });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }
}
