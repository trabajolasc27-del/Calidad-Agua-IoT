import { Component, Inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ThresholdsService } from '../thresholds.service';
import type { ParameterWithThresholds } from '../thresholds.service';

export interface ThresholdFormDialogData {
  entry: ParameterWithThresholds;
}

// Crea una nueva version de umbral para un parametro (RF-16). Se
// precarga con los valores de la version activa actual, si existe, como
// punto de partida para editar -- no se modifica esa version, se crea
// una nueva (D-005, RNF-05: cada medicion pasada conserva el umbral con
// el que fue evaluada).
@Component({
  selector: 'wq-threshold-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './threshold-form-dialog.html',
  styleUrl: './threshold-form-dialog.scss',
})
export class ThresholdFormDialog {
  readonly form = new FormGroup({
    critical_low: new FormControl<number | null>(null),
    warning_low: new FormControl<number | null>(null),
    warning_high: new FormControl<number | null>(null),
    critical_high: new FormControl<number | null>(null),
    consecutive_breaches_to_alert: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly dialogRef: MatDialogRef<ThresholdFormDialog, boolean>,
    private readonly thresholdsService: ThresholdsService,
    @Inject(MAT_DIALOG_DATA) public readonly data: ThresholdFormDialogData,
  ) {
    const current = data.entry.active;
    if (current) {
      this.form.patchValue({
        critical_low: current.critical_low,
        warning_low: current.warning_low,
        warning_high: current.warning_high,
        critical_high: current.critical_high,
        consecutive_breaches_to_alert: current.consecutive_breaches_to_alert,
      });
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const result = await this.thresholdsService.createVersion({
      parameter_id: this.data.entry.parameter.id,
      ...this.form.getRawValue(),
    });

    this.submitting.set(false);

    if (!result.ok) {
      this.errorMessage.set(result.message ?? 'No se pudo crear la nueva versión.');
      return;
    }
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
