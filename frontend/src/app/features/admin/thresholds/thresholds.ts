import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

import { ThresholdsService, type ParameterWithThresholds } from './thresholds.service';
import { ThresholdFormDialog } from './threshold-form-dialog/threshold-form-dialog';

type ViewState = 'loading' | 'data' | 'error';

// Administración > Umbrales (RF-16/RF-17). Una tarjeta por parámetro con
// su umbral vigente y el historial de versiones anteriores.
@Component({
  selector: 'wq-thresholds',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, MatDialogModule, MatExpansionModule, MatIconModule],
  templateUrl: './thresholds.html',
  styleUrl: './thresholds.scss',
})
export class Thresholds implements OnInit {
  readonly state = signal<ViewState>('loading');
  readonly entries = signal<ParameterWithThresholds[]>([]);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly thresholdsService: ThresholdsService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      this.entries.set(await this.thresholdsService.listByParameter());
      this.state.set('data');
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al cargar los umbrales.');
      this.state.set('error');
    }
  }

  openCreateDialog(entry: ParameterWithThresholds): void {
    const ref = this.dialog.open(ThresholdFormDialog, { data: { entry }, width: '480px' });
    ref.afterClosed().subscribe((changed) => {
      if (changed) void this.load();
    });
  }
}
