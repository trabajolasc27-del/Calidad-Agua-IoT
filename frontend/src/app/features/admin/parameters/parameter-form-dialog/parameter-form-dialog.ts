import { Component, Inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ParametersService } from '../parameters.service';
import type { Parameter } from '../../../../core/models/parameter.model';

@Component({
  selector: 'wq-parameter-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './parameter-form-dialog.html',
  styleUrl: './parameter-form-dialog.scss',
})
export class ParameterFormDialog {
  readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    unidad: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    minimo_fisico: new FormControl<number | null>(null),
    maximo_fisico: new FormControl<number | null>(null),
    is_active: new FormControl(true, { nonNullable: true }),
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly dialogRef: MatDialogRef<ParameterFormDialog, boolean>,
    private readonly parametersService: ParametersService,
    @Inject(MAT_DIALOG_DATA) public readonly data: { parameter: Parameter },
  ) {
    const p = data.parameter;
    this.form.patchValue({
      nombre: p.nombre,
      unidad: p.unidad,
      minimo_fisico: p.minimo_fisico,
      maximo_fisico: p.maximo_fisico,
      is_active: p.is_active,
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const result = await this.parametersService.updateParameter(this.data.parameter.id, this.form.getRawValue());

    this.submitting.set(false);

    if (!result.ok) {
      this.errorMessage.set(result.message ?? 'No se pudo guardar el parámetro.');
      return;
    }
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
