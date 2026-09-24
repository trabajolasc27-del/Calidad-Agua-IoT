import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// Shell de Administracion, protegido por roleGuard(['administrador']). Cada
// pestana es una ruta hija.
interface AdminTab {
  label: string;
  path: string | null;
}

@Component({
  selector: 'wq-admin',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {
  readonly tabs: AdminTab[] = [
    { label: 'Usuarios', path: 'usuarios' },
    { label: 'Dispositivos', path: 'dispositivos' },
    { label: 'Ubicaciones', path: 'ubicaciones' },
    { label: 'Parámetros', path: 'parametros' },
    { label: 'Umbrales', path: 'umbrales' },
  ];
}
