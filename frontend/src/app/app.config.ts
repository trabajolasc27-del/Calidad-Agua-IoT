import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

// Nota: @angular/animations esta deprecado desde Angular 21 en favor de
// animate.enter/animate.leave (nativos del framework). Angular Material
// funciona igual sin el modulo de animaciones (modo "noop"), solo sin
// transiciones; se evita a proposito depender de una API deprecada.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes)
  ]
};
