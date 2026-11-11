import { required, schema } from '@angular/forms/signals';

import type { Address } from './address.model';

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

export interface AddressFormModel {
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  streetNumber: string;
  apartment: string;
  city: string;
  province: string;
  postalCode: string;
  betweenStreets: string;
  notes: string;
}

export function emptyAddressModel(): AddressFormModel {
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
    betweenStreets: '',
    notes: '',
  };
}

export function addressToModel(address: Address): AddressFormModel {
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
    betweenStreets: address.betweenStreets ?? '',
    notes: address.notes ?? '',
  };
}

/** Compartido por `/cuenta/direcciones` y el paso 1 del checkout - misma validación en ambos
 *  lugares, un solo sitio para mantenerla. */
export const addressSchema = schema<AddressFormModel>((path) => {
  required(path.label, { message: 'Dale un nombre a esta dirección' });
  required(path.recipientName, { message: 'Ingresá quién recibe el envío' });
  required(path.phone, { message: 'Ingresá un teléfono de contacto' });
  required(path.street, { message: 'Ingresá la calle' });
  required(path.streetNumber, { message: 'Ingresá el número' });
  required(path.city, { message: 'Ingresá la ciudad/localidad' });
  required(path.province, { message: 'Elegí la provincia' });
  required(path.postalCode, { message: 'Ingresá el código postal' });
});
