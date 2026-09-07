import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from '../auth.service';

// Protege rutas que requieren sesion iniciada (todas salvo /login).
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.readyPromise;

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/iniciar-sesion']);
};
