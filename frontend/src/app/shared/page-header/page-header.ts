import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Encabezado de pantalla reutilizable: título, subtítulo opcional, migas de
 * navegación opcionales, y una zona de acciones al final donde cada
 * pantalla proyecta sus propios botones (ng-content). Reemplaza el antiguo
 * `<h1 class="page-title">` repetido a mano en cada plantilla -- ahora cada
 * pantalla comparte la misma jerarquía visual y el mismo punto para
 * mostrar el dispositivo seleccionado, notificaciones o acciones rápidas.
 */
@Component({
  selector: 'wq-page-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  /** Migas opcionales: [{label, url}], la última se muestra sin enlace (pantalla actual). */
  readonly crumbs = input<{ label: string; url?: string }[]>([]);
}
