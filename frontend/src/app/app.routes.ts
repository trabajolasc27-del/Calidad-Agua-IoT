import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'panel' },
  {
    path: 'iniciar-sesion',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'recuperar-contrasena',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'restablecer-contrasena',
    loadComponent: () => import('./features/auth/set-password/set-password').then((m) => m.SetPassword),
  },
  {
    path: 'panel',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'administracion',
    canActivate: [roleGuard(['admin'])],
    loadComponent: () => import('./features/admin/admin').then((m) => m.Admin),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'usuarios' },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/admin/users/users').then((m) => m.Users),
      },
      {
        path: 'dispositivos',
        loadComponent: () => import('./features/admin/devices/devices').then((m) => m.Devices),
      },
    ],
  },
  { path: '**', redirectTo: 'panel' },
];
