import type { Order } from '../../core/orders/order.model';
import { buildWhatsAppActions } from './whatsapp.helper';

const baseOrder: Order = {
  id: '68752940-aaaa-bbbb-cccc-000000000000',
  status: 'paid',
  paymentStatus: 'approved',
  subtotalValue: 220000,
  subtotal: '$220.000',
  totalValue: 220000,
  total: '$220.000',
  currency: 'ARS',
  buyerName: 'Luis Fernando Diaz',
  buyerEmail: 'metaldev06@gmail.com',
  buyerPhone: '3704550519',
  deliveryMethod: 'home_delivery',
  shippingAddress: {
    recipientName: 'Fernando Diaz',
    phone: '3704550519',
    street: 'Juan Luis Diaz',
    streetNumber: '235',
    city: 'Formosa',
    province: 'Formosa',
    postalCode: '3600',
    country: 'Argentina',
  },
  logisticsStatus: 'pending_preparation',
  shippingCostPending: true,
  createdAt: '2026-11-12T21:15:00.000Z',
  updatedAt: '2026-11-12T21:16:00.000Z',
  items: [
    {
      productId: 'p1',
      variantId: 'base',
      productName: 'Emporio Armani Stronger With You Intensely',
      variantLabel: '100ml',
      unitPriceValue: 220000,
      unitPrice: '$220.000',
      quantity: 1,
      lineTotalValue: 220000,
      lineTotal: '$220.000',
    },
  ],
};

describe('buildWhatsAppActions', () => {
  it('returns [] when the order has no buyer phone', () => {
    expect(buildWhatsAppActions({ ...baseOrder, buyerPhone: undefined })).toEqual([]);
  });

  it('builds a detailed "Coordinar envío" message with greeting, items, address and totals', () => {
    const [coordinar] = buildWhatsAppActions(baseOrder);
    const message = decodeURIComponent(coordinar.href.split('?text=')[1]);

    expect(message).toContain('Hola Luis! Te escribimos de Essence Vapes para coordinar el envío de tu pedido #68752940.');
    expect(message).toContain('- 1x Emporio Armani Stronger With You Intensely (100ml)');
    expect(message).toContain('Juan Luis Diaz 235');
    expect(message).toContain('Formosa, Formosa (3600)');
    expect(message).toContain('Subtotal: $220.000');
    expect(message).toContain('El costo de envío lo coordinamos por acá.');
    expect(message).toContain('Total pagado: $220.000');
  });

  it('shows the real shipping cost once it stops being pending', () => {
    const [coordinar] = buildWhatsAppActions({
      ...baseOrder,
      shippingCostPending: false,
      shippingCost: '$5.000',
    });
    const message = decodeURIComponent(coordinar.href.split('?text=')[1]);

    expect(message).toContain('Costo de envío: $5.000');
    expect(message).not.toContain('lo coordinamos por acá');
  });

  it('includes apartment/entre calles/notes when present', () => {
    const [coordinar] = buildWhatsAppActions({
      ...baseOrder,
      shippingAddress: {
        ...baseOrder.shippingAddress!,
        apartment: '4B',
        betweenStreets: 'San Martín y Belgrano',
        notes: 'Timbre roto, golpear la puerta',
      },
    });
    const message = decodeURIComponent(coordinar.href.split('?text=')[1]);

    expect(message).toContain('Juan Luis Diaz 235, 4B');
    expect(message).toContain('Entre calles: San Martín y Belgrano');
    expect(message).toContain('Timbre roto, golpear la puerta');
  });

  it('uses the pickup wording for pickup orders, with no item/address detail', () => {
    const [coordinar] = buildWhatsAppActions({ ...baseOrder, deliveryMethod: 'pickup' });
    const message = decodeURIComponent(coordinar.href.split('?text=')[1]);

    expect(coordinar.label).toBe('Coordinar retiro');
    expect(message).not.toContain('Tu pedido:');
  });
});
