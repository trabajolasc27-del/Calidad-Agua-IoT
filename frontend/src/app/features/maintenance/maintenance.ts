import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { MaintenanceService } from './maintenance.service';
import { RegisterMaintenanceDialog, type RegisterDialogData } from './register-dialog/register-dialog';
import type { MaintenanceEvent } from '../../core/models/maintenance.model';
import type { Device } from '../../core/models/device.model';
import type { Parameter } from '../../core/models/parameter.model';
import { AuthService } from '../../core/auth.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { EmptyState } from '../../shared/empty-state/empty-state';

type ViewState = 'loading' | 'data' | 'empty' | 'error';

// Calibraciones y mantenimiento (ROLE_MATRIX.md, D-007/D-008): el backend
// (tablas + RLS) ya existia completo sin ninguna pantalla que lo usara --
// este modulo nuevo le da acceso real a los 3 roles segun exactamente lo
// que sus politicas RLS ya permiten: administrador y analista consultan
// todo (analista solo lectura), un tecnico de campo solo ve y registra
// sobre sus dispositivos asignados.
@Component({
  selector: 'wq-maintenance',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    PageHeader,
    EmptyState,
  ],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.scss',
})
export class Maintenance implements OnInit {
  readonly deviceFilter = new FormControl<string | null>(null);

  readonly state = signal<ViewState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly events = signal<MaintenanceEvent[]>([]);
  readonly devices = signal<Device[]>([]);
  readonly parameters = signal<Parameter[]>([]);

  readonly canRegister = () => {
    const role = this.authService.role();
    if (role === 'administrador') return true;
    if (role === 'tecnico_campo') return this.devices().length > 0;
    return false;
  };

  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly dialog: MatDialog,
    protected readonly authService: AuthService,
  ) {}

  async ngOnInit(): Promise<void> {
    const [devices, parameters] = await Promise.all([
      this.maintenanceService.listVisibleDevices(),
      this.maintenanceService.listParameters(),
    ]);
    this.devices.set(devices);
    this.parameters.set(parameters);

    this.deviceFilter.valueChanges.subscribe(() => void this.load());
    await this.load();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const events = await this.maintenanceService.listEvents(this.deviceFilter.value);
      this.events.set(events);
      this.state.set(events.length === 0 ? 'empty' : 'data');
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al cargar calibraciones y mantenimiento.');
      this.state.set('error');
    }
  }

  openRegisterDialog(): void {
    const ref = this.dialog.open(RegisterMaintenanceDialog, {
      data: {
        devices: this.devices(),
        parameters: this.parameters(),
        preselectedDeviceId: this.deviceFilter.value,
      } as RegisterDialogData,
      width: '480px',
    });
    ref.afterClosed().subscribe((changed) => {
      if (changed) void this.load();
    });
  }
}
