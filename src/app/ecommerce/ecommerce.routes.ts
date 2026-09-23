import { Routes } from '@angular/router';
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
          description: 'Explorá el catálogo completo de perfumes, decants, vapes y esencias de Essence Vapes.',
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
          description: '¿Dudas sobre un pedido, una fragancia o un envío? Escribinos, te respondemos a la brevedad.',
        },
      },
    ],
  },
];
