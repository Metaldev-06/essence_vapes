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
      },
      {
        path: 'productos',
        loadComponent: () => import('./pages/products/products'),
      },
      {
        path: 'productos/:id',
        loadComponent: () => import('./pages/view-product/view-product'),
      },
      {
        path: 'contacto',
        loadComponent: () => import('./pages/contact/contact'),
      },
    ],
  },
];
