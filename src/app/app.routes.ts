import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: '',
    loadChildren: () => import('./ecommerce/ecommerce.routes').then((m) => m.ecommerceRoutes),
  },
  // {
  //   path: 'invitation',
  //   loadChildren: () => import('./jazmin-fest/jazmin-fest.routes').then((m) => m.jazminFestRoutes),
  // },
  {
    path: '**',
    redirectTo: '',
  },
];
