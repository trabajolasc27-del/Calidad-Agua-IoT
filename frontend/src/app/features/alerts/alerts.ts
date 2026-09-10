import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AlertsService } from './alerts.service';
import type { Alert, AlertStatus } from '../../core/models/alert.model';
import { AlertDetailDialog } from './alert-detail-dialog/alert-detail-dialog';

type ViewState = 'loading' | 'data' | 'empty' | 'error';
type StatusFilter = AlertStatus | 'ALL';

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Nueva',
  ACKNOWLEDGED: 'Reconocida',
  ATTENDED: 'Atendida',
  CLOSED: 'Cerrada',
};

// Alertas (RF-30 a RF-34): nuevas, reconocidas, atendidas y cerradas,
// con filtro por estado. El detalle (linea de tiempo + acciones) vive en
// AlertDetailDialog.
@Component({
  selector: 'wq-alerts',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './alerts.html',
  styleUrl: './alerts.scss',
})
export class Alerts implements OnInit {
  readonly statusLabel = STATUS_LABEL;
  readonly filter = signal<StatusFilter>('NEW');

  readonly state = signal<ViewState>('loading');
  readonly alerts = signal<Alert[]>([]);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  setFilter(status: StatusFilter): void {
    this.filter.set(status);
    void this.load();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const alerts = await this.alertsService.listAlerts(this.filter());
      this.alerts.set(alerts);
      this.state.set(alerts.length === 0 ? 'empty' : 'data');
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al cargar las alertas.');
      this.state.set('error');
    }
  }

  open(alert: Alert): void {
    const ref = this.dialog.open(AlertDetailDialog, { data: { alert }, width: '480px' });
    ref.afterClosed().subscribe((changed) => {
      if (changed) void this.load();
    });
  }
}
