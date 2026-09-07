import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from '../auth.service';
import type { UserRole } from '../models/profile.model';

// Guard de fabrica: roleGuard(['admin']) restringe una ruta a esos roles.
// Es un refuerzo de UX (oculta/rechaza en la interfaz); la proteccion real
// vive en las politicas RLS de Supabase (ver docs/ROLE_MATRIX.md).
export function roleGuard(allowedRoles: UserRole[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.readyPromise;

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/iniciar-sesion']);
    }

    const role = auth.role();
    if (role && allowedRoles.includes(role)) {
      return true;
    }

    return router.createUrlTree(['/panel']);
  };
}
