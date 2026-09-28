import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

// authGuard se aplica una sola vez en la ruta padre que carga AppShell y
// protege todo el subarbol de pantallas autenticadas; roleGuard sigue
// declarado por ruta hija donde aplica (reportes, administracion), igual
// que antes de introducir el shell -- ni las URLs ni el comportamiento de
// los guards cambiaron, solo se dejo de duplicar la barra de navegacion
// en cada pantalla.
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
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./core/shell/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'panel',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'mapa',
        loadComponent: () => import('./features/map/map-view').then((m) => m.MapView),
      },
      {
        path: 'alertas',
        loadComponent: () => import('./features/alerts/alerts').then((m) => m.Alerts),
      },
      {
        path: 'historial',
        loadComponent: () => import('./features/history/history').then((m) => m.History),
      },
      {
        // Lectura de dispositivos para los 3 roles (antes solo existia bajo
        // Administracion, exclusivo de admin). La politica RLS
        // dispositivos_seleccionar ya limitaba esto correctamente en el
        // servidor (admin/analista ven todos, un tecnico solo los suyos
        // asignados) -- esta pantalla solo le da a esa regla una pantalla
        // propia en vez de dejarla sin uso para 2 de los 3 roles.
        path: 'dispositivos',
        loadComponent: () => import('./features/devices/devices-list').then((m) => m.DevicesList),
      },
      {
        path: 'mantenimiento',
        loadComponent: () => import('./features/maintenance/maintenance').then((m) => m.Maintenance),
      },
      {
        path: 'perfil',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'informacion-tecnica',
        loadComponent: () => import('./features/tech-info/tech-info').then((m) => m.TechInfo),
      },
      {
        path: 'reportes',
        canActivate: [roleGuard(['administrador', 'analista'])],
        loadComponent: () => import('./features/reports/reports').then((m) => m.Reports),
      },
      {
        path: 'administracion',
        canActivate: [roleGuard(['administrador'])],
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
    ],
  },
  { path: '**', redirectTo: 'panel' },
];
