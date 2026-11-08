import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { extractErrorMessage } from '../../data/extract-error-message';
import { MessagesAdminService } from '../../data/messages-admin.service';
import { Toast, type ToastMessage } from '../../shared/toast/toast';
import {
  INBOX_LABELS,
  type CannedResponse,
  type InboxAddress,
  type InboxSignature,
} from '../../data/messages-admin.model';

interface CannedResponseFormModel {
  title: string;
  body: string;
  inbox: InboxAddress | '';
}

function emptyModel(): CannedResponseFormModel {
  return { title: '', body: '', inbox: '' };
}

/** Configuración del centro de mensajes - respuestas rápidas y firmas por bandeja. Ambas son
 *  CRUD simples sobre entidades propias del CRM (Resend no tiene equivalente a ninguna de las
 *  dos), ver EMAIL_CRM.md. */
@Component({
  selector: 'app-admin-messages-settings',
  imports: [RouterLink, Toast],
  templateUrl: './messages-settings.html',
  styleUrl: './messages-settings.css',
})
export default class MessagesSettings {
  private readonly messagesAdminService = inject(MessagesAdminService);

  protected readonly inboxLabels = INBOX_LABELS;
  protected readonly inboxOptions: readonly InboxAddress[] = ['contacto', 'ventas', 'soporte'];

  protected readonly cannedResponses = signal<CannedResponse[]>([]);
  protected readonly signatures = signal<InboxSignature[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly formModel = signal<CannedResponseFormModel>(emptyModel());
  protected readonly editingId = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly signatureDrafts = signal<Record<InboxAddress, string>>({
    contacto: '',
    ventas: '',
    soporte: '',
  });
  protected readonly savingSignature = signal<InboxAddress | null>(null);

  protected readonly toast = signal<ToastMessage | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    void this.loadAll();
  }

  private async loadAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [cannedResponses, signatures] = await Promise.all([
        this.messagesAdminService.listCannedResponses(),
        this.messagesAdminService.getSignatures(),
      ]);
      this.cannedResponses.set(cannedResponses);
      this.signatures.set(signatures);
      this.signatureDrafts.set({
        contacto: signatures.find((s) => s.inbox === 'contacto')?.body ?? '',
        ventas: signatures.find((s) => s.inbox === 'ventas')?.body ?? '',
        soporte: signatures.find((s) => s.inbox === 'soporte')?.body ?? '',
      });
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected editCannedResponse(response: CannedResponse): void {
    this.editingId.set(response.id);
    this.formModel.set({ title: response.title, body: response.body, inbox: response.inbox ?? '' });
  }

  protected cancelEdit(): void {
    this.editingId.set(null);
    this.formModel.set(emptyModel());
  }

  protected onTitleInput(event: Event): void {
    this.formModel.update((m) => ({ ...m, title: (event.target as HTMLInputElement).value }));
  }

  protected onBodyInput(event: Event): void {
    this.formModel.update((m) => ({ ...m, body: (event.target as HTMLTextAreaElement).value }));
  }

  protected onInboxSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as InboxAddress | '';
    this.formModel.update((m) => ({ ...m, inbox: value }));
  }

  protected async saveCannedResponse(): Promise<void> {
    const model = this.formModel();
    if (!model.title.trim() || !model.body.trim()) return;

    this.saving.set(true);
    try {
      const dto = { title: model.title.trim(), body: model.body.trim(), inbox: model.inbox || null };
      const editingId = this.editingId();
      if (editingId) {
        const updated = await this.messagesAdminService.updateCannedResponse(editingId, dto);
        this.cannedResponses.update((list) => list.map((r) => (r.id === editingId ? updated : r)));
        this.showToast('Respuesta rápida actualizada', 'success');
      } else {
        const created = await this.messagesAdminService.createCannedResponse(dto);
        this.cannedResponses.update((list) => [...list, created]);
        this.showToast('Respuesta rápida creada', 'success');
      }
      this.cancelEdit();
    } catch (error) {
      this.showToast(extractErrorMessage(error), 'error');
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeCannedResponse(response: CannedResponse): Promise<void> {
    if (!confirm(`¿Eliminar la respuesta rápida "${response.title}"?`)) return;
    try {
      await this.messagesAdminService.removeCannedResponse(response.id);
      this.cannedResponses.update((list) => list.filter((r) => r.id !== response.id));
      this.showToast('Respuesta rápida eliminada', 'success');
    } catch (error) {
      this.showToast(extractErrorMessage(error), 'error');
    }
  }

  protected onSignatureInput(inbox: InboxAddress, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.signatureDrafts.update((drafts) => ({ ...drafts, [inbox]: value }));
  }

  protected async saveSignature(inbox: InboxAddress): Promise<void> {
    this.savingSignature.set(inbox);
    try {
      const updated = await this.messagesAdminService.updateSignature(inbox, this.signatureDrafts()[inbox]);
      this.signatures.update((list) => list.map((s) => (s.inbox === inbox ? updated : s)));
      this.showToast(`Firma de ${this.inboxLabels[inbox]} guardada`, 'success');
    } catch (error) {
      this.showToast(extractErrorMessage(error), 'error');
    } finally {
      this.savingSignature.set(null);
    }
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
