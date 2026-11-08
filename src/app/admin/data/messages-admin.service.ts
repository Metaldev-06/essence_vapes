import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';

import { API_BASE_URL } from '../../core/config/api.config';
import { IS_ADMIN_REQUEST } from '../../core/auth/admin-request.context';
import { AdminAuthService } from './admin-auth.service';
import type {
  CannedResponse,
  ContactSummary,
  InboxAddress,
  InboxSignature,
  InboxSummary,
  MessagesStats,
  MoveFolder,
  StatsPeriod,
  ThreadDetail,
  ThreadListPage,
  ThreadPriority,
  ThreadStatus,
  RealtimeEvent,
} from './messages-admin.model';

const ADMIN_CONTEXT = new HttpContext().set(IS_ADMIN_REQUEST, true);

export interface ListThreadsParams {
  readonly inbox?: InboxAddress;
  readonly folder?: string;
  readonly read?: boolean;
  readonly query?: string;
  readonly limit?: number;
  readonly after?: string;
  readonly before?: string;
}

/** Todo lo que necesita el centro de mensajes del admin - sigue el mismo patrón de
 *  `ProductsAdminService` (context `IS_ADMIN_REQUEST`, nunca hardcodea la URL). */
@Injectable({ providedIn: 'root' })
export class MessagesAdminService {
  private readonly http = inject(HttpClient);
  private readonly adminAuthService = inject(AdminAuthService);
  private readonly baseUrl = `${API_BASE_URL}/messages`;

  listInboxes(): Promise<InboxSummary[]> {
    return firstValueFrom(
      this.http.get<InboxSummary[]>(`${this.baseUrl}/inboxes`, { context: ADMIN_CONTEXT }),
    );
  }

  listThreads(params: ListThreadsParams): Promise<ThreadListPage> {
    const query: Record<string, string | number> = {};
    if (params.inbox) query['inbox'] = params.inbox;
    if (params.folder) query['folder'] = params.folder;
    if (params.read !== undefined) query['read'] = String(params.read);
    if (params.query) query['query'] = params.query;
    if (params.limit) query['limit'] = params.limit;
    if (params.after) query['after'] = params.after;
    if (params.before) query['before'] = params.before;

    return firstValueFrom(
      this.http.get<ThreadListPage>(`${this.baseUrl}/threads`, { params: query, context: ADMIN_CONTEXT }),
    );
  }

  getThread(inbox: InboxAddress, threadId: string): Promise<ThreadDetail> {
    return firstValueFrom(
      this.http.get<ThreadDetail>(`${this.baseUrl}/threads/${inbox}/${threadId}`, {
        context: ADMIN_CONTEXT,
      }),
    );
  }

  reply(
    inbox: InboxAddress,
    threadId: string,
    emailId: string,
    body: { html?: string; text?: string; cc?: string[]; bcc?: string[]; subject?: string },
    files: File[],
    idempotencyKey: string,
  ): Promise<{ id: string }> {
    const formData = new FormData();
    if (body.html) formData.append('html', body.html);
    if (body.text) formData.append('text', body.text);
    if (body.cc?.length) formData.append('cc', body.cc.join(','));
    if (body.bcc?.length) formData.append('bcc', body.bcc.join(','));
    if (body.subject) formData.append('subject', body.subject);
    formData.append('idempotencyKey', idempotencyKey);
    files.forEach((file) => formData.append('files', file));

    return firstValueFrom(
      this.http.post<{ id: string }>(
        `${this.baseUrl}/threads/${inbox}/${threadId}/emails/${emailId}/reply`,
        formData,
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  updateState(
    inbox: InboxAddress,
    threadId: string,
    changes: {
      status?: ThreadStatus;
      priority?: ThreadPriority;
      starred?: boolean;
      assignedAdminId?: string | null;
    },
  ): Promise<unknown> {
    return firstValueFrom(
      this.http.patch(`${this.baseUrl}/threads/${inbox}/${threadId}/state`, changes, {
        context: ADMIN_CONTEXT,
      }),
    );
  }

  setRead(inbox: InboxAddress, threadId: string, read: boolean): Promise<unknown> {
    return firstValueFrom(
      this.http.patch(
        `${this.baseUrl}/threads/${inbox}/${threadId}/read`,
        { read },
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  moveToFolder(inbox: InboxAddress, threadId: string, folder: MoveFolder): Promise<unknown> {
    return firstValueFrom(
      this.http.patch(
        `${this.baseUrl}/threads/${inbox}/${threadId}/folder`,
        { folder },
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  addNote(inbox: InboxAddress, threadId: string, body: string): Promise<unknown> {
    return firstValueFrom(
      this.http.post(
        `${this.baseUrl}/threads/${inbox}/${threadId}/notes`,
        { body },
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  listCannedResponses(inbox?: InboxAddress): Promise<CannedResponse[]> {
    return firstValueFrom(
      this.http.get<CannedResponse[]>(`${this.baseUrl}/canned-responses`, {
        params: inbox ? { inbox } : {},
        context: ADMIN_CONTEXT,
      }),
    );
  }

  createCannedResponse(dto: { title: string; body: string; inbox?: InboxAddress | null }): Promise<CannedResponse> {
    return firstValueFrom(
      this.http.post<CannedResponse>(`${this.baseUrl}/canned-responses`, dto, { context: ADMIN_CONTEXT }),
    );
  }

  updateCannedResponse(
    id: string,
    dto: { title?: string; body?: string; inbox?: InboxAddress | null },
  ): Promise<CannedResponse> {
    return firstValueFrom(
      this.http.patch<CannedResponse>(`${this.baseUrl}/canned-responses/${id}`, dto, {
        context: ADMIN_CONTEXT,
      }),
    );
  }

  removeCannedResponse(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/canned-responses/${id}`, { context: ADMIN_CONTEXT }),
    );
  }

  previewCannedResponse(
    id: string,
    variables: { nombreCliente?: string; producto?: string; comercio?: string },
  ): Promise<{ body: string }> {
    return firstValueFrom(
      this.http.get<{ body: string }>(`${this.baseUrl}/canned-responses/${id}/preview`, {
        params: { ...variables },
        context: ADMIN_CONTEXT,
      }),
    );
  }

  getSignatures(): Promise<InboxSignature[]> {
    return firstValueFrom(
      this.http.get<InboxSignature[]>(`${this.baseUrl}/signatures`, { context: ADMIN_CONTEXT }),
    );
  }

  updateSignature(inbox: InboxAddress, body: string): Promise<InboxSignature> {
    return firstValueFrom(
      this.http.patch<InboxSignature>(
        `${this.baseUrl}/signatures/${inbox}`,
        { body },
        { context: ADMIN_CONTEXT },
      ),
    );
  }

  getContact(email: string): Promise<ContactSummary> {
    return firstValueFrom(
      this.http.get<ContactSummary>(`${this.baseUrl}/contacts/${encodeURIComponent(email)}`, {
        context: ADMIN_CONTEXT,
      }),
    );
  }

  getStats(period: StatsPeriod): Promise<MessagesStats> {
    return firstValueFrom(
      this.http.get<MessagesStats>(`${this.baseUrl}/stats`, {
        params: { period },
        context: ADMIN_CONTEXT,
      }),
    );
  }

  /**
   * SSE vía `fetch` + `ReadableStream` (no `EventSource` nativo: este backend solo acepta el
   * token admin como header `Authorization`, y `EventSource` no permite mandar headers propios).
   * Devuelve un `Observable` que emite cada evento parseado y se cierra solo si el caller se
   * desuscribe (el `AbortController` corta la conexión fetch en curso).
   */
  watchEvents(): Observable<RealtimeEvent> {
    return new Observable<RealtimeEvent>((subscriber) => {
      const controller = new AbortController();
      const token = this.adminAuthService.token();

      (async () => {
        try {
          const response = await fetch(`${this.baseUrl}/events`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
          });
          if (!response.body) return;

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              try {
                subscriber.next(JSON.parse(line.slice(5).trim()) as RealtimeEvent);
              } catch {
                /* Línea de keep-alive u otro formato no-JSON - se ignora. */
              }
            }
          }
        } catch (error) {
          if ((error as { name?: string }).name !== 'AbortError') subscriber.error(error);
        }
      })();

      return () => controller.abort();
    });
  }
}
