import { Component, computed, effect, inject, signal } from '@angular/core';
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
import { AuthService } from '../../../../core/auth/auth.service';
import type { DeliveryMethod } from '../../../../core/orders/order.model';
import { CheckoutService, type DeliverySelection } from '../checkout.service';

/**
 * Paso 1/4 del checkout - elegir modalidad de entrega (envío a domicilio o retiro en el local,
 * ver tarea: gestión 100% propia, sin Mercado Envíos), completar los datos que corresponda, y
 * aceptar los T&C.
 */
@Component({
  selector: 'app-checkout-address-step',
  imports: [FormField, RouterLink],
  templateUrl: './checkout-address-step.html',
  styleUrl: './checkout-address-step.css',
})
export default class CheckoutAddressStep {
  protected readonly addressesService = inject(AddressesService);
  private readonly authService = inject(AuthService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly router = inject(Router);

  protected readonly provinces = ARGENTINA_PROVINCES;
  protected readonly showNewAddressForm = signal(false);

  private readonly initialSelection = this.checkoutService.deliverySelection();

  protected readonly deliveryMethod = signal<DeliveryMethod>(this.initialSelection?.method ?? 'home_delivery');
  protected readonly selectedId = signal<string | null>(
    this.initialSelection?.method === 'home_delivery' ? this.initialSelection.addressId : null,
  );
  protected readonly pickupContactName = signal(
    this.initialSelection?.method === 'pickup' ? this.initialSelection.pickupContactName : '',
  );
  protected readonly pickupPhone = signal(
    this.initialSelection?.method === 'pickup' ? this.initialSelection.pickupPhone : '',
  );
  protected readonly pickupNotes = signal(
    this.initialSelection?.method === 'pickup' ? this.initialSelection.pickupNotes : '',
  );
  protected readonly acceptTerms = signal(this.checkoutService.acceptedTerms());

  private readonly modelSignal = signal<AddressFormModel>(emptyAddressModel());
  protected readonly addressForm = form(this.modelSignal, addressSchema);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly canContinue = computed(() => {
    if (!this.acceptTerms()) return false;
    return this.deliveryMethod() === 'home_delivery'
      ? this.selectedId() !== null
      : this.pickupContactName().trim().length > 0 && this.pickupPhone().trim().length > 0;
  });

  constructor() {
    // Si se llega directo a este paso (link compartido, refresh) sin nada elegido todavía,
    // preseleccionar la dirección predeterminada en cuanto `AddressesService` termine de cargar.
    effect(() => {
      if (this.deliveryMethod() === 'home_delivery' && this.selectedId() === null) {
        const defaultAddress = this.addressesService.defaultAddress();
        if (defaultAddress) this.selectedId.set(defaultAddress.id);
      }
    });
  }

  protected selectMethod(method: DeliveryMethod): void {
    this.deliveryMethod.set(method);

    // Precarga de datos de la cuenta para el retiro (ver tarea, punto 2) - solo si todavía no
    // se completó nada, nunca pisa lo que el usuario ya escribió.
    if (method === 'pickup' && !this.pickupContactName() && !this.pickupPhone()) {
      const user = this.authService.user();
      if (user) {
        this.pickupContactName.set(user.fullName);
        this.pickupPhone.set(user.phone ?? '');
      }
    }
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
      ...(model.betweenStreets.trim() ? { betweenStreets: model.betweenStreets.trim() } : {}),
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

  protected onPickupContactNameInput(event: Event): void {
    this.pickupContactName.set((event.target as HTMLInputElement).value);
  }

  protected onPickupPhoneInput(event: Event): void {
    this.pickupPhone.set((event.target as HTMLInputElement).value);
  }

  protected onPickupNotesInput(event: Event): void {
    this.pickupNotes.set((event.target as HTMLTextAreaElement).value);
  }

  protected continue(): void {
    if (!this.canContinue()) return;

    const selection: DeliverySelection =
      this.deliveryMethod() === 'home_delivery'
        ? { method: 'home_delivery', addressId: this.selectedId()! }
        : {
            method: 'pickup',
            pickupContactName: this.pickupContactName().trim(),
            pickupPhone: this.pickupPhone().trim(),
            pickupNotes: this.pickupNotes().trim(),
          };

    this.checkoutService.setDeliveryAndTerms(selection, this.acceptTerms());
    void this.router.navigateByUrl('/checkout/resumen');
  }
}
