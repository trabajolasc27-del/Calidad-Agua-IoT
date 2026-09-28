import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';

import { routes } from './app.routes';
import { buildSpanishPaginatorIntl } from './core/spanish-paginator-intl';

// Fechas y numeros en formato regional es-MX (Fase 5 del rediseño): sin
// esto, el pipe `date` de Angular usa en-US por defecto (p. ej.
// "9/14/2026, 5:22 PM" en vez de "14/09/2026, 17:22"), aunque el resto de
// la interfaz este en español.
registerLocaleData(localeEsMx);

// Nota: @angular/animations esta deprecado desde Angular 21 en favor de
// animate.enter/animate.leave (nativos del framework). Angular Material
// funciona igual sin el modulo de animaciones (modo "noop"), solo sin
// transiciones; se evita a proposito depender de una API deprecada.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'es-MX' },
    { provide: MatPaginatorIntl, useFactory: buildSpanishPaginatorIntl },
  ]
};
