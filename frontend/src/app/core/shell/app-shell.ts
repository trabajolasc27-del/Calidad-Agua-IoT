import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../auth.service';

/**
 * Que es: el marco visual compartido por toda pantalla autenticada (logo,
 * navegacion principal, menu de usuario) con un <router-outlet> adentro
 * para el contenido propio de cada pantalla.
 *
 * Por que existe (antes no habia): cada pantalla (Dashboard, Alertas,
 * Historial, Reportes, Mapa, Administracion) traia su propia
 * <mat-toolbar> a mano, y las que no eran el Dashboard solo ofrecian un
 * enlace "Panel" para volver -- no habia forma de saltar de Alertas a
 * Historial sin pasar primero por el Dashboard. Con el shell, la barra de
 * navegacion vive en un solo lugar y cualquier pantalla puede alcanzar a
 * cualquier otra directamente.
 *
 * Como funciona: app.routes.ts anida las rutas autenticadas (panel, mapa,
 * alertas, historial, reportes, administracion) como hijas de una ruta
 * padre que carga este componente; authGuard sigue viviendo en la ruta
 * padre (protege todo el subarbol de una sola vez) y roleGuard sigue
 * viviendo en cada hija que lo necesita (reportes, administracion), sin
 * cambios de comportamiento ni de URL.
 */
@Component({
  selector: 'wq-app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule, MatMenuModule, MatIconModule],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  constructor(
    protected readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async logout(): Promise<void> {
    await this.authService.signOut();
    await this.router.navigateByUrl('/iniciar-sesion');
  }
}
