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
        data: { breadcrumbs: [{ label: 'Productos' }] },
      },
      {
        path: 'productos/nuevo',
        loadComponent: () => import('./pages/product-form/product-form'),
        title: 'Nuevo producto | Admin Essence Vapes',
        data: {
          breadcrumbs: [{ label: 'Productos', link: '/admin/productos' }, { label: 'Nuevo producto' }],
        },
      },
      {
        path: 'productos/:id/editar',
        loadComponent: () => import('./pages/product-form/product-form'),
        title: 'Editar producto | Admin Essence Vapes',
        data: {
          breadcrumbs: [{ label: 'Productos', link: '/admin/productos' }, { label: 'Editar producto' }],
        },
      },
      {
        path: 'reportes',
        loadComponent: () => import('./pages/reports/reports'),
        title: 'Reportes | Admin Essence Vapes',
        data: { breadcrumbs: [{ label: 'Reportes' }] },
      },
      {
        path: 'ventas',
        loadComponent: () => import('./pages/orders/orders'),
        title: 'Ventas / Pedidos | Admin Essence Vapes',
        data: { breadcrumbs: [{ label: 'Ventas' }] },
      },
      {
        path: 'ventas/:id',
        loadComponent: () => import('./pages/orders/order-detail/order-detail'),
        title: 'Detalle de orden | Admin Essence Vapes',
        data: {
          breadcrumbs: [{ label: 'Ventas', link: '/admin/ventas' }, { label: 'Detalle de orden' }],
        },
      },
      {
        path: 'transacciones',
        loadComponent: () => import('./pages/transactions/transactions'),
        title: 'Transacciones | Admin Essence Vapes',
        data: { breadcrumbs: [{ label: 'Transacciones' }] },
      },
      {
        path: 'arrepentimientos',
        loadComponent: () => import('./pages/withdrawal-requests/withdrawal-requests'),
        title: 'Botón de arrepentimiento | Admin Essence Vapes',
        data: { breadcrumbs: [{ label: 'Botón de arrepentimiento' }] },
      },
      {
        path: 'mensajes',
        loadComponent: () => import('./pages/messages/messages'),
        title: 'Mensajes | Admin Essence Vapes',
        data: { breadcrumbs: [{ label: 'Mensajes' }] },
      },
      {
        path: 'mensajes/configuracion',
        loadComponent: () => import('./pages/messages-settings/messages-settings'),
        title: 'Configuración de mensajes | Admin Essence Vapes',
        data: {
          breadcrumbs: [{ label: 'Mensajes', link: '/admin/mensajes' }, { label: 'Configuración' }],
        },
      },
    ],
  },
];
