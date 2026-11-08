import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';

import { extractErrorMessage } from '../../../../data/extract-error-message';
import { MessagesAdminService } from '../../../../data/messages-admin.service';
import type { CannedResponse, InboxAddress } from '../../../../data/messages-admin.model';

const DRAFT_STORAGE_PREFIX = 'ev:admin-message-draft:';
const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface DraftSnapshot {
  readonly html: string;
  readonly cc: string;
  readonly bcc: string;
}

/**
 * Editor de respuesta embebido en `thread-view` - formato básico (negrita/itálica/link) vía
 * `document.execCommand` sobre un `div[contenteditable]` (liviano: este proyecto no tiene ninguna
 * librería de rich text ya instalada, y una completa sería desproporcionado para "negrita, itálica,
 * links, saltos de línea"). El HTML se sanitiza igual en el backend antes de guardarse/enviarse -
 * esto es solo para que el admin vea lo que está escribiendo.
 */
@Component({
  selector: 'app-reply-editor',
  imports: [],
  templateUrl: './reply-editor.html',
  styleUrl: './reply-editor.css',
})
export class ReplyEditor {
  private readonly messagesAdminService = inject(MessagesAdminService);

  readonly inbox = input.required<InboxAddress>();
  readonly threadId = input.required<string>();
  readonly emailId = input.required<string>();
  readonly signature = input<string>('');
  readonly cannedResponses = input<readonly CannedResponse[]>([]);

  readonly sent = output<void>();

  private readonly editorRef = viewChild<ElementRef<HTMLDivElement>>('editor');

  protected readonly showCcBcc = signal(false);
  protected readonly ccValue = signal('');
  protected readonly bccValue = signal('');
  protected readonly attachments = signal<File[]>([]);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly justSent = signal(false);
  protected readonly selectedCannedId = signal('');

  private idempotencyKey = crypto.randomUUID();
  private draftKey = '';
  private draftTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingDraftHtml: string | null = null;

  ngOnInit(): void {
    this.draftKey = `${DRAFT_STORAGE_PREFIX}${this.threadId()}`;
    this.loadDraftSnapshot();
  }

  /** `editorRef()` solo existe después de que la vista se inicializa - por eso el HTML del
   *  borrador recién se aplica acá, no en `ngOnInit` (los campos cc/bcc, que no dependen del
   *  DOM, ya se setearon ahí). */
  ngAfterViewInit(): void {
    if (this.pendingDraftHtml === null) return;
    const editor = this.editorRef()?.nativeElement;
    if (editor) editor.innerHTML = this.pendingDraftHtml;
  }

  ngOnDestroy(): void {
    clearTimeout(this.draftTimer);
  }

  protected format(command: 'bold' | 'italic' | 'underline'): void {
    document.execCommand(command);
    this.editorRef()?.nativeElement.focus();
    this.scheduleDraftSave();
  }

  protected insertLink(): void {
    const url = prompt('URL del enlace (https://...)');
    if (!url) return;
    document.execCommand('createLink', false, url);
    this.scheduleDraftSave();
  }

  protected insertSignature(): void {
    const signatureText = this.signature().trim();
    if (!signatureText) return;
    const editor = this.editorRef()?.nativeElement;
    if (!editor) return;
    const html = signatureText
      .split('\n')
      .map((line) => `<div>${this.escapeHtml(line)}</div>`)
      .join('');
    editor.innerHTML += `<div><br></div>${html}`;
    this.scheduleDraftSave();
  }

  protected onCannedResponseSelected(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.selectedCannedId.set(id);
    if (!id) return;
    const canned = this.cannedResponses().find((c) => c.id === id);
    const editor = this.editorRef()?.nativeElement;
    if (!canned || !editor) return;
    const html = canned.body
      .split('\n')
      .map((line) => `<div>${this.escapeHtml(line)}</div>`)
      .join('');
    editor.innerHTML += html;
    this.selectedCannedId.set('');
    this.scheduleDraftSave();
  }

  protected onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';

    const current = this.attachments();
    const rejected: string[] = [];
    const accepted: File[] = [];

    for (const file of files) {
      if (current.length + accepted.length >= MAX_FILES) {
        rejected.push(`${file.name} (máximo ${MAX_FILES} archivos)`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} (supera 10MB)`);
        continue;
      }
      if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        rejected.push(`${file.name} (tipo no permitido)`);
        continue;
      }
      accepted.push(file);
    }

    if (rejected.length > 0) this.error.set(`No se adjuntaron: ${rejected.join(', ')}`);
    this.attachments.set([...current, ...accepted]);
  }

  protected removeAttachment(index: number): void {
    this.attachments.update((files) => files.filter((_, i) => i !== index));
  }

  protected onEditorInput(): void {
    this.scheduleDraftSave();
  }

  protected onCcInput(event: Event): void {
    this.ccValue.set((event.target as HTMLInputElement).value);
    this.scheduleDraftSave();
  }

  protected onBccInput(event: Event): void {
    this.bccValue.set((event.target as HTMLInputElement).value);
    this.scheduleDraftSave();
  }

  protected discard(): void {
    const editor = this.editorRef()?.nativeElement;
    if (editor) editor.innerHTML = '';
    this.ccValue.set('');
    this.bccValue.set('');
    this.attachments.set([]);
    this.error.set(null);
    this.clearDraft();
  }

  protected async send(): Promise<void> {
    const editor = this.editorRef()?.nativeElement;
    const html = editor?.innerHTML.trim() ?? '';
    if (!html || html === '<br>') {
      this.error.set('Escribí algo antes de responder');
      return;
    }
    if (this.sending()) return;

    this.sending.set(true);
    this.error.set(null);
    try {
      await this.messagesAdminService.reply(
        this.inbox(),
        this.threadId(),
        this.emailId(),
        {
          html,
          cc: this.parseEmails(this.ccValue()),
          bcc: this.parseEmails(this.bccValue()),
        },
        this.attachments(),
        this.idempotencyKey,
      );
      this.clearDraft();
      if (editor) editor.innerHTML = '';
      this.ccValue.set('');
      this.bccValue.set('');
      this.attachments.set([]);
      this.idempotencyKey = crypto.randomUUID();
      this.justSent.set(true);
      setTimeout(() => this.justSent.set(false), 3000);
      this.sent.emit();
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.sending.set(false);
    }
  }

  private parseEmails(value: string): string[] | undefined {
    const emails = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    return emails.length > 0 ? emails : undefined;
  }

  private scheduleDraftSave(): void {
    clearTimeout(this.draftTimer);
    this.draftTimer = setTimeout(() => this.saveDraft(), 600);
  }

  private saveDraft(): void {
    const editor = this.editorRef()?.nativeElement;
    if (!editor || !this.draftKey) return;
    const snapshot: DraftSnapshot = {
      html: editor.innerHTML,
      cc: this.ccValue(),
      bcc: this.bccValue(),
    };
    try {
      if (!snapshot.html || snapshot.html === '<br>') {
        sessionStorage.removeItem(this.draftKey);
      } else {
        sessionStorage.setItem(this.draftKey, JSON.stringify(snapshot));
      }
    } catch {
      /* Best-effort - igual que el resto de los stores de sessionStorage del proyecto. */
    }
  }

  private loadDraftSnapshot(): void {
    if (!this.draftKey) return;
    try {
      const raw = sessionStorage.getItem(this.draftKey);
      if (!raw) return;
      const snapshot = JSON.parse(raw) as DraftSnapshot;
      this.pendingDraftHtml = snapshot.html;
      this.ccValue.set(snapshot.cc ?? '');
      this.bccValue.set(snapshot.bcc ?? '');
      if (snapshot.cc || snapshot.bcc) this.showCcBcc.set(true);
    } catch {
      /* Borrador corrupto/no disponible - se ignora, el admin arranca en blanco. */
    }
  }

  private clearDraft(): void {
    try {
      if (this.draftKey) sessionStorage.removeItem(this.draftKey);
    } catch {
      /* noop */
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
