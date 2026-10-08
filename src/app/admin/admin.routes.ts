import { Routes } from '@angular/router';
import { adminGuestOnlyGuard } from './data/admin-guest-only.guard';
import { adminOnlyGuard } from './data/admin-only.guard';
import { Admin } from './admin';

export const adminRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login'),
    canActivate: [adminGuestOnlyGuard],
    title: 'Ingreso administrador | Essence Vapes',
  },
  {
    path: '',
    component: Admin,
    canActivate: [adminOnlyGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard'),
        title: 'Dashboard | Admin Essence Vapes',
      },
      {
        path: 'productos',
        loadComponent: () => import('./pages/products/products'),
        title: 'Productos | Admin Essence Vapes',
      },
      {
        path: 'productos/nuevo',
        loadComponent: () => import('./pages/product-form/product-form'),
        title: 'Nuevo producto | Admin Essence Vapes',
      },
      {
        path: 'productos/:id/editar',
        loadComponent: () => import('./pages/product-form/product-form'),
        title: 'Editar producto | Admin Essence Vapes',
      },
    ],
  },
];
