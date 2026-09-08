import { Component, Inject, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UsersService } from '../users.service';
import type { Profile, UserRole } from '../../../../core/models/profile.model';
import { ROLE_LABELS } from '../../../../core/models/profile.model';
import type { DeviceSummary } from '../../../../core/models/device.model';

export interface UserFormDialogData {
  mode: 'create' | 'edit';
  profile?: Profile;
}

const ROLES: UserRole[] = ['admin', 'analyst', 'field_tech'];

@Component({
  selector: 'wq-user-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './user-form-dialog.html',
  styleUrl: './user-form-dialog.scss',
})
export class UserFormDialog implements OnInit {
  readonly roles = ROLES;
  readonly roleLabels = ROLE_LABELS;

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    full_name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    role: new FormControl<UserRole>('field_tech', { nonNullable: true, validators: [Validators.required] }),
    is_active: new FormControl(true, { nonNullable: true }),
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly devices = signal<DeviceSummary[]>([]);
  readonly assignedDeviceIds = signal<Set<string>>(new Set());
  readonly loadingDevices = signal(false);

  constructor(
    private readonly dialogRef: MatDialogRef<UserFormDialog, boolean>,
    private readonly usersService: UsersService,
    @Inject(MAT_DIALOG_DATA) public readonly data: UserFormDialogData,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.data.mode === 'edit' && this.data.profile) {
      const p = this.data.profile;
      this.form.patchValue({
        email: p.email ?? '',
        full_name: p.full_name ?? '',
        role: p.role,
        is_active: p.is_active,
      });
      this.form.controls.email.disable();
    }

    this.loadingDevices.set(true);
    try {
      this.devices.set(await this.usersService.listDevices());
      if (this.data.mode === 'edit' && this.data.profile) {
        const assigned = await this.usersService.listAssignedDeviceIds(this.data.profile.id);
        this.assignedDeviceIds.set(new Set(assigned));
      }
    } catch (err) {
      console.error(err);
    } finally {
      this.loadingDevices.set(false);
    }
  }

  get showDeviceAssignment(): boolean {
    return this.data.mode === 'edit' && this.form.controls.role.value === 'field_tech';
  }

  toggleDevice(deviceId: string, checked: boolean): void {
    const next = new Set(this.assignedDeviceIds());
    if (checked) {
      next.add(deviceId);
    } else {
      next.delete(deviceId);
    }
    this.assignedDeviceIds.set(next);
  }

  isDeviceAssigned(deviceId: string): boolean {
    return this.assignedDeviceIds().has(deviceId);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { email, full_name, role, is_active } = this.form.getRawValue();

    if (this.data.mode === 'create') {
      const result = await this.usersService.createUser({ email, full_name, role });
      this.submitting.set(false);
      if (!result.ok) {
        this.errorMessage.set(result.message ?? 'No se pudo crear el usuario.');
        return;
      }
      this.dialogRef.close(true);
      return;
    }

    // Edición
    const profile = this.data.profile!;
    const updateResult = await this.usersService.updateProfile(profile.id, { full_name, role, is_active });
    if (!updateResult.ok) {
      this.submitting.set(false);
      this.errorMessage.set(updateResult.message ?? 'No se pudo actualizar el usuario.');
      return;
    }

    if (role === 'field_tech') {
      const assignResult = await this.usersService.setDeviceAssignments(profile.id, Array.from(this.assignedDeviceIds()));
      if (!assignResult.ok) {
        this.submitting.set(false);
        this.errorMessage.set(assignResult.message ?? 'Se guardó el usuario, pero no la asignación de dispositivos.');
        return;
      }
    }

    this.submitting.set(false);
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
