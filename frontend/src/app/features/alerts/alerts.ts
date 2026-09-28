import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AlertsService, type AlertFilters } from './alerts.service';
import type { Alert, AlertSeverity, AlertStatus } from '../../core/models/alert.model';
import type { DashboardDevice } from '../dashboard/dashboard.service';
import type { Parameter } from '../../core/models/parameter.model';
import { AlertDetailDialog } from './alert-detail-dialog/alert-detail-dialog';
import { PageHeader } from '../../shared/page-header/page-header';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { alertSeverityStatus, alertStatusMeta } from '../../shared/status.util';

type ViewState = 'loading' | 'data' | 'empty' | 'error';
type StatusFilter = AlertStatus | 'ALL';

// Alertas (RF-30 a RF-34): flujo Nueva -> Reconocida -> Atendida -> Cerrada
// (los 4 valores ya viven en español en la base de datos desde D-021, asi
// que no hace falta una capa de traduccion). Filtros por estado (pestañas,
// como antes), y ahora tambien por gravedad, dispositivo, parametro y
// rango de fechas -- el detalle (linea de tiempo + acciones) sigue en
// AlertDetailDialog.
@Component({
  selector: 'wq-alerts',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    PageHeader,
    EmptyState,
    StatusBadge,
  ],
  templateUrl: './alerts.html',
  styleUrl: './alerts.scss',
})
export class Alerts implements OnInit {
  readonly alertStatusMeta = alertStatusMeta;
  readonly alertSeverityStatus = alertSeverityStatus;

  readonly filter = signal<StatusFilter>('NUEVA');

  readonly extraFilters = new FormGroup({
    severity: new FormControl<AlertSeverity | null>(null),
    deviceId: new FormControl<string | null>(null),
    parameterId: new FormControl<string | null>(null),
    dateFrom: new FormControl<string | null>(null),
    dateTo: new FormControl<string | null>(null),
  });

  readonly state = signal<ViewState>('loading');
  readonly alerts = signal<Alert[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly devices = signal<DashboardDevice[]>([]);
  readonly parameters = signal<Parameter[]>([]);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly dialog: MatDialog,
  ) {}

  async ngOnInit(): Promise<void> {
    const [devices, parameters] = await Promise.all([this.alertsService.listDevices(), this.alertsService.listParameters()]);
    this.devices.set(devices);
    this.parameters.set(parameters);

    this.extraFilters.valueChanges.subscribe(() => void this.load());
    await this.load();
  }

  setFilter(status: StatusFilter): void {
    this.filter.set(status);
    void this.load();
  }

  clearExtraFilters(): void {
    this.extraFilters.reset();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const raw = this.extraFilters.getRawValue();
      const filters: AlertFilters = {
        status: this.filter(),
        severity: raw.severity,
        deviceId: raw.deviceId,
        parameterId: raw.parameterId,
        dateFrom: raw.dateFrom ? new Date(raw.dateFrom).toISOString() : null,
        dateTo: raw.dateTo ? new Date(raw.dateTo + 'T23:59:59').toISOString() : null,
      };
      const alerts = await this.alertsService.listAlerts(filters);
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
