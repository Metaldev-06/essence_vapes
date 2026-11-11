import { Injectable } from '@angular/core';

const SDK_SCRIPT_SRC = 'https://sdk.mercadopago.com/js/v2';

/** Settings mínimos del Payment Brick que esta integración usa - ver
 *  `checkout-brick-step/checkout-brick-step.ts` para el resto del flujo. */
export interface PaymentBrickSettings {
  initialization: { amount: number; payer?: { email?: string } };
  customization: {
    paymentMethods: { creditCard: 'all'; debitCard: 'all' };
  };
  callbacks: {
    onReady?: () => void;
    onSubmit: (data: {
      selectedPaymentMethod: string;
      formData: PaymentBrickFormData;
    }) => Promise<void>;
    onError?: (error: unknown) => void;
  };
}

export interface PaymentBrickFormData {
  token: string;
  payment_method_id: string;
  issuer_id?: string;
  installments: number;
  payer?: { email?: string; identification?: { type: string; number: string } };
}

export interface PaymentBrickController {
  unmount: () => void;
}

interface MercadoPagoBricksBuilder {
  create: (
    type: 'payment',
    containerId: string,
    settings: PaymentBrickSettings,
  ) => Promise<PaymentBrickController>;
}

interface MercadoPagoInstance {
  bricks: () => MercadoPagoBricksBuilder;
}

type MercadoPagoCtor = new (publicKey: string, options?: { locale?: string }) => MercadoPagoInstance;

declare global {
  interface Window {
    MercadoPago?: MercadoPagoCtor;
    /** Generado automáticamente por el SDK v2 (ver docs "Integrar el Device ID") - no hace
     *  falta agregar el script de seguridad aparte para obtenerlo. */
    MP_DEVICE_SESSION_ID?: string;
  }
}

/**
 * Carga perezosa del SDK oficial de Mercado Pago (`sdk.mercadopago.com/js/v2`) - solo cuando el
 * paso de pago del checkout realmente se monta, no en cada página del sitio. La Public Key es
 * segura para exponer en el cliente (nunca el Access Token, que vive solo en el backend).
 */
@Injectable({ providedIn: 'root' })
export class MercadoPagoSdkService {
  private loadPromise: Promise<void> | null = null;

  async createInstance(publicKey: string): Promise<MercadoPagoInstance> {
    await this.ensureScriptLoaded();
    if (!window.MercadoPago) {
      throw new Error('El SDK de Mercado Pago no se cargó correctamente');
    }
    return new window.MercadoPago(publicKey, { locale: 'es-AR' });
  }

  /** Puede no estar listo apenas carga el SDK - se vuelve a leer recién al enviar el pago. */
  getDeviceId(): string | null {
    return window.MP_DEVICE_SESSION_ID ?? null;
  }

  private ensureScriptLoaded(): Promise<void> {
    if (window.MercadoPago) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('No se pudo cargar el SDK de Mercado Pago'));
      document.head.appendChild(script);
    });
    return this.loadPromise;
  }
}
