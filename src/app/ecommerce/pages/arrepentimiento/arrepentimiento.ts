import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, minLength, required, schema } from '@angular/forms/signals';

import {
  WithdrawalRequestCreated,
  WithdrawalRequestStatus,
  WithdrawalRequestsService,
} from '../../data/withdrawal-requests.service';

interface WithdrawalModel {
  buyerName: string;
  email: string;
  phone: string;
  orderReference: string;
  productDescription: string;
  comments: string;
}

function emptyWithdrawalModel(): WithdrawalModel {
  return { buyerName: '', email: '', phone: '', orderReference: '', productDescription: '', comments: '' };
}

const withdrawalSchema = schema<WithdrawalModel>((path) => {
  required(path.buyerName, { message: 'Ingresá tu nombre completo' });
  minLength(path.buyerName, 3, { message: 'Mínimo 3 caracteres' });
  required(path.email, { message: 'Ingresá tu email' });
  email(path.email, { message: 'Ingresá un email válido' });
  required(path.productDescription, { message: 'Describí qué producto querés devolver' });
  minLength(path.productDescription, 3, { message: 'Mínimo 3 caracteres' });
});

interface LookupModel {
  trackingCode: string;
  email: string;
}

function emptyLookupModel(): LookupModel {
  return { trackingCode: '', email: '' };
}

const lookupSchema = schema<LookupModel>((path) => {
  required(path.trackingCode, { message: 'Ingresá el código de gestión' });
  required(path.email, { message: 'Ingresá el email con el que hiciste la solicitud' });
  email(path.email, { message: 'Ingresá un email válido' });
});

export const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  recibido: 'Recibida',
  en_revision: 'En revisión',
  confirmado: 'Confirmada',
  rechazado: 'Rechazada',
};

/**
 * "Botón de arrepentimiento" (Disposición 954/2025): funciona sin cuenta ni login, con un
 * código de gestión que confirma la recepción al instante (dentro del plazo legal de 24hs) y
 * una segunda vista para consultar el estado de una solicitud ya hecha.
 */
@Component({
  selector: 'app-arrepentimiento',
  imports: [FormField],
  templateUrl: './arrepentimiento.html',
  styleUrl: './arrepentimiento.css',
})
export default class Arrepentimiento {
  private readonly withdrawalRequestsService = inject(WithdrawalRequestsService);

  protected readonly view = signal<'form' | 'lookup'>('form');

  private readonly model = signal<WithdrawalModel>(emptyWithdrawalModel());
  protected readonly withdrawalForm = form(this.model, withdrawalSchema);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly created = signal<WithdrawalRequestCreated | null>(null);

  private readonly lookupModel = signal<LookupModel>(emptyLookupModel());
  protected readonly lookupForm = form(this.lookupModel, lookupSchema);
  protected readonly lookingUp = signal(false);
  protected readonly lookupError = signal<string | null>(null);
  protected readonly lookupResult = signal<WithdrawalRequestStatus | null>(null);

  protected readonly statusLabels = WITHDRAWAL_STATUS_LABELS;

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    this.withdrawalForm().markAsTouched();
    if (!this.withdrawalForm().valid()) return;

    this.submitting.set(true);
    this.error.set(null);
    const { buyerName, email: emailValue, phone, orderReference, productDescription, comments } =
      this.model();
    const result = await this.withdrawalRequestsService.create({
      buyerName,
      email: emailValue,
      phone: phone || undefined,
      orderReference: orderReference || undefined,
      productDescription,
      comments: comments || undefined,
    });
    this.submitting.set(false);

    if (result.success) {
      this.created.set(result.data);
    } else {
      this.error.set(result.message);
    }
  }

  protected sendAnother(): void {
    this.model.set(emptyWithdrawalModel());
    this.created.set(null);
    this.error.set(null);
  }

  protected async onLookup(event: Event): Promise<void> {
    event.preventDefault();
    this.lookupForm().markAsTouched();
    if (!this.lookupForm().valid()) return;

    this.lookingUp.set(true);
    this.lookupError.set(null);
    const { trackingCode, email: emailValue } = this.lookupModel();
    const result = await this.withdrawalRequestsService.lookup(trackingCode, emailValue);
    this.lookingUp.set(false);

    if (result.success) {
      this.lookupResult.set(result.data);
    } else {
      this.lookupResult.set(null);
      this.lookupError.set(result.message);
    }
  }
}
