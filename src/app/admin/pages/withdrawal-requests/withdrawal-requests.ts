import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';

import { extractErrorMessage } from '../../data/extract-error-message';
import {
  WithdrawalRequestRecord,
  WithdrawalRequestsAdminService,
  WithdrawalStatus,
} from '../../data/withdrawal-requests-admin.service';

const PAGE_SIZE = 20;

interface StatusOption {
  readonly id: WithdrawalStatus | 'todos';
  readonly label: string;
}

const STATUS_LABELS: Record<WithdrawalStatus, string> = {
  recibido: 'Recibida',
  en_revision: 'En revisión',
  confirmado: 'Confirmada',
  rechazado: 'Rechazada',
};

/** Seguimiento interno del "botón de arrepentimiento" (Disposición 954/2025) - panel admin. */
@Component({
  selector: 'app-admin-withdrawal-requests',
  imports: [DatePipe],
  templateUrl: './withdrawal-requests.html',
  styleUrl: './withdrawal-requests.css',
})
export default class AdminWithdrawalRequests {
  private readonly withdrawalRequestsAdminService = inject(WithdrawalRequestsAdminService);

  protected readonly statusLabels = STATUS_LABELS;
  protected readonly statusOptions: readonly StatusOption[] = [
    { id: 'todos', label: 'Todas' },
    { id: 'recibido', label: 'Recibida' },
    { id: 'en_revision', label: 'En revisión' },
    { id: 'confirmado', label: 'Confirmada' },
    { id: 'rechazado', label: 'Rechazada' },
  ];
  protected readonly statusValues: readonly WithdrawalStatus[] = [
    'recibido',
    'en_revision',
    'confirmado',
    'rechazado',
  ];

  protected readonly status = signal<WithdrawalStatus | 'todos'>('todos');
  protected readonly offset = signal(0);

  protected readonly items = signal<readonly WithdrawalRequestRecord[]>([]);
  protected readonly total = signal(0);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly updatingId = signal<string | null>(null);

  protected readonly page = computed(() => Math.floor(this.offset() / PAGE_SIZE) + 1);
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly hasPrev = computed(() => this.offset() > 0);
  protected readonly hasNext = computed(() => this.offset() + PAGE_SIZE < this.total());

  constructor() {
    effect(() => {
      this.status();
      untracked(() => this.offset.set(0));
    });

    effect(() => {
      const status = this.status();
      const offset = this.offset();
      untracked(() => void this.load(status, offset));
    });
  }

  protected prevPage(): void {
    if (this.hasPrev()) this.offset.update((value) => Math.max(0, value - PAGE_SIZE));
  }

  protected nextPage(): void {
    if (this.hasNext()) this.offset.update((value) => value + PAGE_SIZE);
  }

  protected async changeStatus(record: WithdrawalRequestRecord, event: Event): Promise<void> {
    const nextStatus = (event.target as HTMLSelectElement).value as WithdrawalStatus;
    if (nextStatus === record.status) return;

    this.updatingId.set(record.id);
    this.error.set(null);
    try {
      const updated = await this.withdrawalRequestsAdminService.updateStatus(
        record.id,
        nextStatus,
      );
      this.items.update((items) =>
        items.map((item) => (item.id === record.id ? updated : item)),
      );
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.updatingId.set(null);
    }
  }

  private async load(status: WithdrawalStatus | 'todos', offset: number): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const page = await this.withdrawalRequestsAdminService.list({
        status: status === 'todos' ? undefined : status,
        limit: PAGE_SIZE,
        offset,
      });
      this.items.set(page.data);
      this.total.set(page.pagination.total);
    } catch (error) {
      this.error.set(extractErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }
}
