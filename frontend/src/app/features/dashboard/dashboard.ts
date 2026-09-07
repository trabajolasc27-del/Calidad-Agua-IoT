import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth.service';

// Cascaron minimo del Dashboard (RF-22 a RF-26 llegan en la Fase 3, cuando
// exista informacion real de dispositivos y mediciones). Por ahora
// demuestra el ciclo completo: sesion protegida, perfil cargado, logout.
@Component({
  selector: 'wq-dashboard',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatToolbarModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  constructor(
    protected readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async logout(): Promise<void> {
    await this.authService.signOut();
    await this.router.navigateByUrl('/iniciar-sesion');
  }
}
