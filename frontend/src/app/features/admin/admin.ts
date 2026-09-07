import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

// Cascaron de Administracion, protegido por roleGuard(['admin']). Los
// submodulos reales (usuarios, dispositivos, ubicaciones, parametros,
// umbrales) se construyen conforme avanza la Fase 2.
@Component({
  selector: 'wq-admin',
  standalone: true,
  imports: [RouterLink, MatToolbarModule, MatButtonModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin {}
