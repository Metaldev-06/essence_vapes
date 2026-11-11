import { Component, effect, inject, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import {
  ARGENTINA_PROVINCES,
  addressSchema,
  emptyAddressModel,
  type AddressFormModel,
} from '../../../../core/addresses/address-form';
import { AddressesService } from '../../../../core/addresses/addresses.service';
import type { Address, AddressInput } from '../../../../core/addresses/address.model';
import { CheckoutService } from '../checkout.service';

/** Paso 1/4 del checkout - elegir (o crear) la dirección de envío y aceptar los T&C. */
@Component({
  selector: 'app-checkout-address-step',
  imports: [FormField, RouterLink],
  templateUrl: './checkout-address-step.html',
  styleUrl: './checkout-address-step.css',
})
export default class CheckoutAddressStep {
  protected readonly addressesService = inject(AddressesService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly router = inject(Router);

  protected readonly provinces = ARGENTINA_PROVINCES;
  protected readonly showNewAddressForm = signal(false);
  protected readonly selectedId = signal<string | null>(this.checkoutService.selectedAddressId());
  protected readonly acceptTerms = signal(this.checkoutService.acceptedTerms());

  private readonly modelSignal = signal<AddressFormModel>(emptyAddressModel());
  protected readonly addressForm = form(this.modelSignal, addressSchema);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  constructor() {
    // Si se llega directo a este paso (link compartido, refresh) sin nada elegido todavía,
    // preseleccionar la dirección predeterminada en cuanto `AddressesService` termine de cargar.
    effect(() => {
      if (this.selectedId() === null) {
        const defaultAddress = this.addressesService.defaultAddress();
        if (defaultAddress) this.selectedId.set(defaultAddress.id);
      }
    });
  }

  protected select(address: Address): void {
    this.selectedId.set(address.id);
  }

  protected openNewAddressForm(): void {
    this.modelSignal.set(emptyAddressModel());
    this.formError.set(null);
    this.showNewAddressForm.set(true);
  }

  protected async submitNewAddress(event: Event): Promise<void> {
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
    const result = await this.addressesService.create(input);
    this.submitting.set(false);

    if (!result.success) {
      this.formError.set(result.message ?? 'No pudimos guardar la dirección');
      return;
    }

    this.showNewAddressForm.set(false);
    this.selectedId.set(result.address!.id);
  }

  protected continue(): void {
    const addressId = this.selectedId();
    if (!addressId || !this.acceptTerms()) return;
    this.checkoutService.setAddressAndTerms(addressId, this.acceptTerms());
    void this.router.navigateByUrl('/checkout/resumen');
  }
}
