export type InboxAddress = 'contacto' | 'ventas' | 'soporte';
export type MessageFolder = 'inbox' | 'archive' | 'spam' | 'sent' | 'trash';
export type MoveFolder = 'inbox' | 'archive' | 'spam' | 'trash';

export type ThreadStatus =
  | 'nuevo'
  | 'pendiente'
  | 'en_proceso'
  | 'esperando_cliente'
  | 'resuelto'
  | 'cerrado';

export type ThreadPriority = 'baja' | 'media' | 'alta';

export const INBOX_LABELS: Record<InboxAddress, string> = {
  contacto: 'Contacto',
  ventas: 'Ventas',
  soporte: 'Soporte',
};

export const THREAD_STATUS_LABELS: Record<ThreadStatus, string> = {
  nuevo: 'Nuevo',
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  esperando_cliente: 'Esperando cliente',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
};

export const THREAD_PRIORITY_LABELS: Record<ThreadPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};

export interface ThreadLabel {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface ThreadSummary {
  readonly id: string;
  readonly inbox: InboxAddress;
  readonly subject: string | null;
  readonly from: string | null;
  readonly to: readonly string[];
  readonly labels: readonly ThreadLabel[];
  readonly emailCount: number;
  readonly hasAttachment: boolean;
  readonly hasDraft: boolean;
  readonly read: boolean;
  readonly receivedAt: string;
  readonly folder: MessageFolder;
  readonly status: ThreadStatus;
  readonly priority: ThreadPriority;
  readonly starred: boolean;
  readonly assignedAdminId: string | null;
}

export interface ThreadListPage {
  readonly data: readonly ThreadSummary[];
  readonly hasMore: boolean;
}

export interface MessageAttachment {
  readonly id: string;
  readonly filename: string | null;
  readonly size: number | null;
}

export interface ThreadEmail {
  readonly id: string;
  readonly direction: 'inbound' | 'outbound';
  readonly from: string;
  readonly to: readonly string[];
  readonly cc: readonly string[];
  readonly bcc: readonly string[];
  readonly subject: string | null;
  readonly html: string | null;
  readonly text: string | null;
  readonly attachments: readonly MessageAttachment[];
  readonly read: boolean;
  readonly receivedAt: string;
}

export interface ThreadNote {
  readonly id: string;
  readonly body: string;
  readonly authorName: string;
  readonly createdAt: string;
}

export interface ThreadDetail {
  readonly thread: {
    readonly id: string;
    readonly subject: string | null;
    readonly folder: MessageFolder;
    readonly labels: readonly ThreadLabel[];
    readonly read: boolean;
  };
  readonly inbox: InboxAddress;
  readonly emails: readonly ThreadEmail[];
  readonly hasMoreEmails: boolean;
  readonly status: ThreadStatus;
  readonly priority: ThreadPriority;
  readonly starred: boolean;
  readonly assignedAdminId: string | null;
  readonly notes: readonly ThreadNote[];
}

export interface InboxSummary {
  readonly inbox: InboxAddress;
  readonly unread: number;
}

export interface CannedResponse {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly inbox: InboxAddress | null;
}

export interface InboxSignature {
  readonly id: string;
  readonly inbox: InboxAddress;
  readonly body: string;
}

export interface ContactSummary {
  readonly email: string;
  readonly conversationCount: number;
  readonly lastContact: string | null;
  readonly threads: ReadonlyArray<{
    readonly id: string;
    readonly inbox: InboxAddress;
    readonly subject: string | null;
    readonly receivedAt: string;
    readonly folder: MessageFolder;
  }>;
  readonly registeredAccount: { readonly fullName: string; readonly memberSince: string } | null;
}

export interface MessagesStats {
  readonly unreadByInbox: readonly InboxSummary[];
  readonly totalUnread: number;
  readonly byStatus: Record<ThreadStatus, number>;
  readonly received: number;
  readonly sent: number;
  readonly avgFirstResponseMinutes: number | null;
}

export type StatsPeriod = 'today' | '7d' | '30d' | 'all';

export type RealtimeEvent =
  | { type: 'thread.new_email'; inbox: InboxAddress; threadId: string }
  | { type: 'thread.updated'; inbox: InboxAddress; threadId: string };
