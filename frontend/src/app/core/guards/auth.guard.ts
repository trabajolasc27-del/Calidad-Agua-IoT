import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from '../auth.service';

/**
 * Que es: protege toda ruta que requiera sesion iniciada. Desde el
 * rediseño con AppShell, se declara una sola vez en la ruta padre que
 * carga el shell (ver app.routes.ts) en vez de repetirse en cada
 * pantalla hija -- el guard de un padre corre antes de resolver
 * cualquiera de sus hijos, asi que sigue protegiendo exactamente las
 * mismas rutas que antes.
 *
 * Por que espera readyPromise: al recargar la pagina, Supabase todavia
 * esta resolviendo si hay una sesion guardada (localStorage) cuando el
 * router intenta activar la ruta. Sin este await, el guard vería
 * isAuthenticated() en false por un instante y mandaria a un usuario ya
 * autenticado de vuelta al login.
 */
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.readyPromise;

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/iniciar-sesion']);
};
