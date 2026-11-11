import { Routes } from '@angular/router';
import { authOnlyGuard } from '../core/auth/auth-only.guard';
import { guestOnlyGuard } from '../core/auth/guest-only.guard';
import { Ecommerce } from './ecommerce';
import { CheckoutService } from './pages/checkout/checkout.service';

export const ecommerceRoutes: Routes = [
  {
    path: '',
    component: Ecommerce,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home/home'),
        title: 'Essence Vapes | Perfumes, Decants y Esencias Premium',
        data: {
          description:
            'Perfumes originales, decants seleccionados, vapes y esencias premium. Envíos a todo el país, productos 100% originales.',
        },
      },
      {
        path: 'productos',
        loadComponent: () => import('./pages/products/products'),
        title: 'Productos | Essence Vapes',
        data: {
          description:
            'Explorá el catálogo completo de perfumes, decants, vapes y esencias de Essence Vapes.',
        },
      },
      {
        path: 'productos/:id',
        loadComponent: () => import('./pages/view-product/view-product'),
        title: 'Producto | Essence Vapes',
        data: {
          description: 'Conocé los detalles, notas y precio de esta fragancia en Essence Vapes.',
        },
      },
      {
        path: 'comparar',
        loadComponent: () => import('./pages/compare/compare'),
        title: 'Comparar fragancias | Essence Vapes',
        data: {
          description:
            'Compará en tiempo real notas, estadísticas y precio entre distintos perfumes, decants y esencias.',
        },
      },
      {
        path: 'contacto',
        loadComponent: () => import('./pages/contact/contact'),
        title: 'Contacto | Essence Vapes',
        data: {
          description:
            '¿Dudas sobre un pedido, una fragancia o un envío? Escribinos, te respondemos a la brevedad.',
        },
      },
      {
        path: 'auth/login',
        loadComponent: () => import('./pages/auth/login/login'),
        canActivate: [guestOnlyGuard],
        title: 'Iniciar sesión | Essence Vapes',
        data: {
          description:
            'Iniciá sesión en tu cuenta de Essence Vapes para ver tus pedidos y favoritos.',
        },
      },
      {
        path: 'auth/register',
        loadComponent: () => import('./pages/auth/register/register'),
        canActivate: [guestOnlyGuard],
        title: 'Crear cuenta | Essence Vapes',
        data: {
          description:
            'Creá tu cuenta de Essence Vapes para guardar favoritos y agilizar tus compras.',
        },
      },
      {
        path: 'auth/verificar-email',
        loadComponent: () => import('./pages/auth/verify-email/verify-email'),
        title: 'Verificá tu correo | Essence Vapes',
        data: { description: 'Confirmá tu dirección de correo para activar tu cuenta.' },
      },
      {
        path: 'auth/olvide-contrasena',
        loadComponent: () => import('./pages/auth/forgot-password/forgot-password'),
        canActivate: [guestOnlyGuard],
        title: 'Recuperar contraseña | Essence Vapes',
        data: { description: 'Recuperá el acceso a tu cuenta de Essence Vapes.' },
      },
      {
        path: 'auth/verificar-codigo',
        loadComponent: () => import('./pages/auth/verify-code/verify-code'),
        canActivate: [guestOnlyGuard],
        title: 'Ingresá el código | Essence Vapes',
        data: { description: 'Ingresá el código que te enviamos por correo.' },
      },
      {
        path: 'auth/restablecer-contrasena',
        loadComponent: () => import('./pages/auth/reset-password/reset-password'),
        canActivate: [guestOnlyGuard],
        title: 'Nueva contraseña | Essence Vapes',
        data: { description: 'Elegí una contraseña nueva para tu cuenta.' },
      },
      {
        path: 'cuenta',
        loadComponent: () => import('./pages/account/account'),
        canActivate: [authOnlyGuard],
        children: [
          { path: '', redirectTo: 'informacion-personal', pathMatch: 'full' },
          {
            path: 'informacion-personal',
            loadComponent: () => import('./pages/account/information/account-information'),
            title: 'Información personal | Essence Vapes',
            data: { description: 'Tu nombre y tu correo de acceso.' },
          },
          {
            path: 'direcciones',
            loadComponent: () => import('./pages/account/addresses/account-addresses'),
            title: 'Direcciones | Essence Vapes',
            data: { description: 'Tus direcciones de envío guardadas.' },
          },
          {
            path: 'pedidos',
            loadComponent: () => import('./pages/account/orders/account-orders'),
            title: 'Mis compras | Essence Vapes',
            data: { description: 'El historial de tus compras.' },
          },
          {
            path: 'pedidos/:id',
            loadComponent: () => import('./pages/account/orders/account-order-detail'),
            title: 'Detalle del pedido | Essence Vapes',
            data: { description: 'Detalle y estado de tu pedido.' },
          },
          {
            path: 'seguridad',
            loadComponent: () => import('./pages/account/security/account-security'),
            title: 'Seguridad | Essence Vapes',
            data: { description: 'Contraseña y sesiones activas de tu cuenta.' },
          },
        ],
      },
      {
        path: 'favoritos',
        loadComponent: () => import('./pages/favorites/favorites'),
        canActivate: [authOnlyGuard],
        title: 'Mis favoritos | Essence Vapes',
        data: {
          description: 'Tus fragancias favoritas, tu perfil de gustos y filtros por ocasión.',
        },
      },
      {
        path: 'carrito',
        loadComponent: () => import('./pages/cart/cart'),
        title: 'Carrito | Essence Vapes',
        data: {
          description: 'Revisá tu carrito de compras antes de continuar al pago.',
        },
      },
      {
        path: 'checkout',
        loadComponent: () => import('./pages/checkout/checkout'),
        canActivate: [authOnlyGuard],
        // Una sola instancia de `CheckoutService` compartida por los 4 pasos, que se recrea
        // (se resetea) cada vez que se entra de nuevo a /checkout - ver ese servicio.
        providers: [CheckoutService],
        children: [
          { path: '', redirectTo: 'direccion', pathMatch: 'full' },
          {
            path: 'direccion',
            loadComponent: () => import('./pages/checkout/address-step/checkout-address-step'),
            title: 'Dirección de envío | Essence Vapes',
            data: { description: 'Elegí la dirección donde recibís tu pedido.' },
          },
          {
            path: 'resumen',
            loadComponent: () => import('./pages/checkout/summary-step/checkout-summary-step'),
            title: 'Resumen de tu compra | Essence Vapes',
            data: { description: 'Revisá tu pedido antes de pagar.' },
          },
          {
            path: 'pago',
            loadComponent: () => import('./pages/checkout/payment-step/checkout-payment-step'),
            title: 'Pago | Essence Vapes',
            data: { description: 'Pagá tu pedido de forma segura con Mercado Pago.' },
          },
          {
            path: 'resultado',
            loadComponent: () => import('./pages/checkout/result-step/checkout-result-step'),
            title: 'Resultado del pago | Essence Vapes',
            data: { description: 'Estado de tu pago.' },
          },
        ],
      },
      {
        path: 'arrepentimiento',
        loadComponent: () => import('./pages/arrepentimiento/arrepentimiento'),
        title: 'Botón de arrepentimiento | Essence Vapes',
        data: {
          description:
            'Ejercé tu derecho de arrepentimiento de compra a distancia, sin necesidad de cuenta.',
        },
      },
      {
        path: 'legales/terminos',
        loadComponent: () => import('./pages/legal/terms'),
        title: 'Términos y condiciones | Essence Vapes',
        data: { description: 'Términos y condiciones de compra en Essence Vapes.' },
      },
      {
        path: 'legales/privacidad',
        loadComponent: () => import('./pages/legal/privacy'),
        title: 'Política de privacidad | Essence Vapes',
        data: { description: 'Cómo tratamos tus datos personales en Essence Vapes.' },
      },
      {
        path: 'legales/cookies',
        loadComponent: () => import('./pages/legal/cookies'),
        title: 'Política de cookies | Essence Vapes',
        data: { description: 'Qué cookies y almacenamiento usamos en Essence Vapes.' },
      },
      {
        path: 'legales/envios',
        loadComponent: () => import('./pages/legal/shipping'),
        title: 'Envíos y entregas | Essence Vapes',
        data: { description: 'Cobertura, tiempos y condiciones de envío de Essence Vapes.' },
      },
      {
        path: 'legales/cambios-y-devoluciones',
        loadComponent: () => import('./pages/legal/returns'),
        title: 'Cambios y devoluciones | Essence Vapes',
        data: { description: 'Cómo gestionamos cambios, devoluciones y garantías.' },
      },
      {
        path: 'legales/identificacion',
        loadComponent: () => import('./pages/legal/seller-identity'),
        title: 'Identificación del vendedor | Essence Vapes',
        data: { description: 'Datos legales y comerciales del titular de Essence Vapes.' },
      },
    ],
  },
];
