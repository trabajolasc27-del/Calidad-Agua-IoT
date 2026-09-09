import { Component, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ParametersService } from './parameters.service';
import type { Parameter } from '../../../core/models/parameter.model';
import { ParameterFormDialog } from './parameter-form-dialog/parameter-form-dialog';

type ViewState = 'loading' | 'data' | 'error';

// Administración > Parámetros (RF-15). Catálogo fijo de los 4 parámetros
// oficiales; sin alta ni baja a propósito (ver el modelo).
@Component({
  selector: 'wq-parameters',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatProgressSpinnerModule, MatDialogModule],
  templateUrl: './parameters.html',
  styleUrl: './parameters.scss',
})
export class Parameters implements OnInit {
  readonly displayedColumns = ['code', 'name', 'unit', 'range', 'status', 'actions'];

  readonly state = signal<ViewState>('loading');
  readonly parameters = signal<Parameter[]>([]);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly parametersService: ParametersService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.parameters.set(await this.parametersService.listParameters());
      this.state.set('data');
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al cargar los parámetros.');
      this.state.set('error');
    }
  }

  edit(parameter: Parameter): void {
    const ref = this.dialog.open(ParameterFormDialog, { data: { parameter }, width: '440px' });
    ref.afterClosed().subscribe((changed) => {
      if (changed) void this.load();
    });
  }
}
