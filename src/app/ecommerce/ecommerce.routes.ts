import { Routes } from '@angular/router';
import { authOnlyGuard } from '../core/auth/auth-only.guard';
import { guestOnlyGuard } from '../core/auth/guest-only.guard';
import { Ecommerce } from './ecommerce';

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
