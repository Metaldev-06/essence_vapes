import { Component, inject, signal } from '@angular/core';
import { FormField, form, required, schema } from '@angular/forms/signals';

import { AddressesService } from '../../../../core/addresses/addresses.service';
import type { Address, AddressInput } from '../../../../core/addresses/address.model';

/** 24 provincias (CABA incluida) - lista fija, no vale la pena traerla del backend. */
export const ARGENTINA_PROVINCES: readonly string[] = [
  'Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Ciudad Autónoma de Buenos Aires',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
];

interface AddressFormModel {
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  streetNumber: string;
  apartment: string;
  city: string;
  province: string;
  postalCode: string;
  notes: string;
}

function emptyAddressModel(): AddressFormModel {
  return {
    label: '',
    recipientName: '',
    phone: '',
    street: '',
    streetNumber: '',
    apartment: '',
    city: '',
    province: '',
    postalCode: '',
    notes: '',
  };
}

function addressToModel(address: Address): AddressFormModel {
  return {
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    street: address.street,
    streetNumber: address.streetNumber,
    apartment: address.apartment ?? '',
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    notes: address.notes ?? '',
  };
}

const addressSchema = schema<AddressFormModel>((path) => {
  required(path.label, { message: 'Dale un nombre a esta dirección' });
  required(path.recipientName, { message: 'Ingresá quién recibe el envío' });
  required(path.phone, { message: 'Ingresá un teléfono de contacto' });
  required(path.street, { message: 'Ingresá la calle' });
  required(path.streetNumber, { message: 'Ingresá el número' });
  required(path.city, { message: 'Ingresá la ciudad/localidad' });
  required(path.province, { message: 'Elegí la provincia' });
  required(path.postalCode, { message: 'Ingresá el código postal' });
});

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
