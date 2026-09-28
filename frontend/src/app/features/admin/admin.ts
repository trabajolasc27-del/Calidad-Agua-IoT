import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { PageHeader } from '../../shared/page-header/page-header';

// Shell de Administracion, protegido por roleGuard(['administrador']). Cada
// pestana es una ruta hija.
interface AdminTab {
  label: string;
  path: string | null;
  icon: string;
}

@Component({
  selector: 'wq-admin',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatIconModule, PageHeader],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  readonly tabs: AdminTab[] = [
    { label: 'Usuarios', path: 'usuarios', icon: 'group' },
    { label: 'Dispositivos', path: 'dispositivos', icon: 'sensors' },
    { label: 'Ubicaciones', path: 'ubicaciones', icon: 'location_on' },
    { label: 'Parámetros', path: 'parametros', icon: 'science' },
    { label: 'Umbrales', path: 'umbrales', icon: 'tune' },
  ];
}
