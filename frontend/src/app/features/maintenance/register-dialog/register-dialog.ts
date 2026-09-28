import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';

import { MaintenanceService } from '../maintenance.service';
import type { Device } from '../../../core/models/device.model';
import type { Parameter } from '../../../core/models/parameter.model';

export interface RegisterDialogData {
  devices: Device[];
  parameters: Parameter[];
  preselectedDeviceId: string | null;
}

@Component({
  selector: 'wq-register-maintenance-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonToggleModule,
    MatIconModule,
  ],
  templateUrl: './register-dialog.html',
  styleUrl: './register-dialog.scss',
})
export class RegisterMaintenanceDialog implements OnInit {
  readonly ref = inject(MatDialogRef<RegisterMaintenanceDialog, boolean>);
  readonly data = inject<RegisterDialogData>(MAT_DIALOG_DATA);
  private readonly maintenanceService = inject(MaintenanceService);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = new FormGroup({
    kind: new FormControl<'calibracion' | 'mantenimiento'>('calibracion', { nonNullable: true }),
    dispositivo_id: new FormControl<string | null>(null, Validators.required),
    parametro_id: new FormControl<string | null>(null),
    notas: new FormControl<string>('', { nonNullable: true }),
    proxima_fecha: new FormControl<string | null>(null),
  });

  ngOnInit(): void {
    if (this.data.preselectedDeviceId) {
      this.form.patchValue({ dispositivo_id: this.data.preselectedDeviceId });
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);

    const raw = this.form.getRawValue();
    const result = await this.maintenanceService.register({
      dispositivo_id: raw.dispositivo_id!,
      kind: raw.kind,
      parametro_id: raw.kind === 'calibracion' ? raw.parametro_id : null,
      notas: raw.notas?.trim() || null,
      proxima_fecha: raw.proxima_fecha,
    });

    this.submitting.set(false);
    if (!result.ok) {
      this.errorMessage.set(result.message ?? 'No se pudo registrar el evento.');
      return;
    }
    this.ref.close(true);
  }
}
