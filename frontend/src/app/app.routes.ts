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
    path: 'mapa',
    canActivate: [authGuard],
    loadComponent: () => import('./features/map/map-view').then((m) => m.MapView),
  },
  {
    path: 'alertas',
    canActivate: [authGuard],
    loadComponent: () => import('./features/alerts/alerts').then((m) => m.Alerts),
  },
  {
    path: 'historial',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/history').then((m) => m.History),
  },
  {
    path: 'reportes',
    canActivate: [roleGuard(['admin', 'analyst'])],
    loadComponent: () => import('./features/reports/reports').then((m) => m.Reports),
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
      {
        path: 'ubicaciones',
        loadComponent: () => import('./features/admin/locations/locations').then((m) => m.Locations),
      },
      {
        path: 'parametros',
        loadComponent: () => import('./features/admin/parameters/parameters').then((m) => m.Parameters),
      },
      {
        path: 'umbrales',
        loadComponent: () => import('./features/admin/thresholds/thresholds').then((m) => m.Thresholds),
      },
    ],
  },
  { path: '**', redirectTo: 'panel' },
];
