export interface Address {
  readonly id: string;
  readonly label: string;
  readonly recipientName: string;
  readonly phone: string;
  readonly street: string;
  readonly streetNumber: string;
  readonly apartment: string | null;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string;
  readonly country: string;
  readonly betweenStreets: string | null;
  readonly notes: string | null;
  readonly isDefault: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Shape que manda el form - sin `id`/`isDefault`/timestamps, esos los decide el backend. */
export interface AddressInput {
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  streetNumber: string;
  apartment?: string;
  city: string;
  province: string;
  postalCode: string;
  betweenStreets?: string;
  notes?: string;
  isDefault?: boolean;
}
