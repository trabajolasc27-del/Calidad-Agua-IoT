import { Component, Inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DevicesService } from '../devices.service';
import type { Device, DeviceStatus } from '../../../../core/models/device.model';
import type { LocationSummary } from '../../../../core/models/location.model';

export interface DeviceFormDialogData {
  mode: 'create' | 'edit';
  device?: Device;
}

@Component({
  selector: 'wq-device-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './device-form-dialog.html',
  styleUrl: './device-form-dialog.scss',
})
export class DeviceFormDialog implements OnInit {
  readonly form = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    location_id: new FormControl<string | null>(null),
    status: new FormControl<DeviceStatus>('active', { nonNullable: true }),
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly locations = signal<LocationSummary[]>([]);

  constructor(
    private readonly dialogRef: MatDialogRef<DeviceFormDialog, { changed: boolean; newDeviceId?: string }>,
    private readonly devicesService: DevicesService,
    @Inject(MAT_DIALOG_DATA) public readonly data: DeviceFormDialogData,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.data.mode === 'edit' && this.data.device) {
      const d = this.data.device;
      this.form.patchValue({ code: d.code, name: d.name, location_id: d.location_id, status: d.status });
      this.form.controls.code.disable(); // el codigo identifica al dispositivo, no se cambia
    }

    try {
      this.locations.set(await this.devicesService.listLocations());
    } catch (err) {
      console.error(err);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { code, name, location_id, status } = this.form.getRawValue();

    if (this.data.mode === 'create') {
      const result = await this.devicesService.createDevice({ code, name, location_id });
      this.submitting.set(false);
      if (!result.ok) {
        this.errorMessage.set(result.message ?? 'No se pudo crear el dispositivo.');
        return;
      }
      this.dialogRef.close({ changed: true, newDeviceId: result.deviceId });
      return;
    }

    const result = await this.devicesService.updateDevice(this.data.device!.id, { name, location_id, status });
    this.submitting.set(false);
    if (!result.ok) {
      this.errorMessage.set(result.message ?? 'No se pudo actualizar el dispositivo.');
      return;
    }
    this.dialogRef.close({ changed: true });
  }

  cancel(): void {
    this.dialogRef.close({ changed: false });
  }
}
