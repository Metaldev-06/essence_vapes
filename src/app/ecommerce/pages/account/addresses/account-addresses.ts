import { Component, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

import {
  ARGENTINA_PROVINCES,
  addressSchema,
  addressToModel,
  emptyAddressModel,
  type AddressFormModel,
} from '../../../../core/addresses/address-form';
import { AddressesService } from '../../../../core/addresses/addresses.service';
import type { Address, AddressInput } from '../../../../core/addresses/address.model';

type FormMode = 'closed' | 'new' | 'edit';

/** `/cuenta/direcciones` - CRUD de direcciones de envío (ver `AddressesService`). */
@Component({
  selector: 'app-account-addresses',
  imports: [FormField],
  templateUrl: './account-addresses.html',
  styleUrl: './account-addresses.css',
})
export default class AccountAddresses {
  protected readonly addressesService = inject(AddressesService);
  protected readonly provinces = ARGENTINA_PROVINCES;

  protected readonly mode = signal<FormMode>('closed');
  protected readonly editingId = signal<string | null>(null);
  private readonly modelSignal = signal<AddressFormModel>(emptyAddressModel());
  protected readonly addressForm = form(this.modelSignal, addressSchema);

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly actionPendingId = signal<string | null>(null);

  protected openNew(): void {
    this.modelSignal.set(emptyAddressModel());
    this.formError.set(null);
    this.editingId.set(null);
    this.mode.set('new');
  }

  protected openEdit(address: Address): void {
    this.modelSignal.set(addressToModel(address));
    this.formError.set(null);
    this.editingId.set(address.id);
    this.mode.set('edit');
  }

  protected closeForm(): void {
    this.mode.set('closed');
    this.editingId.set(null);
  }

  protected async submitForm(event: Event): Promise<void> {
    event.preventDefault();
    this.addressForm().markAsTouched();
    if (!this.addressForm().valid()) return;

    const model = this.modelSignal();
    const input: AddressInput = {
      label: model.label.trim(),
      recipientName: model.recipientName.trim(),
      phone: model.phone.trim(),
      street: model.street.trim(),
      streetNumber: model.streetNumber.trim(),
      city: model.city.trim(),
      province: model.province,
      postalCode: model.postalCode.trim(),
      ...(model.apartment.trim() ? { apartment: model.apartment.trim() } : {}),
      ...(model.notes.trim() ? { notes: model.notes.trim() } : {}),
    };

    this.submitting.set(true);
    this.formError.set(null);
    const editingId = this.editingId();
    const result = editingId
      ? await this.addressesService.update(editingId, input)
      : await this.addressesService.create(input);
    this.submitting.set(false);

    if (result.success) {
      this.closeForm();
    } else {
      this.formError.set(result.message ?? 'No pudimos guardar la dirección');
    }
  }

  protected async remove(address: Address): Promise<void> {
    this.actionPendingId.set(address.id);
    this.actionError.set(null);
    const result = await this.addressesService.remove(address.id);
    this.actionPendingId.set(null);

    if (!result.success) this.actionError.set(result.message ?? 'No pudimos eliminar la dirección');
  }

  protected async setDefault(address: Address): Promise<void> {
    this.actionPendingId.set(address.id);
    this.actionError.set(null);
    const result = await this.addressesService.setDefault(address.id);
    this.actionPendingId.set(null);

    if (!result.success) this.actionError.set(result.message ?? 'No pudimos actualizar la dirección');
  }
}
