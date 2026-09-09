import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/auth.service';
import { DashboardService, type DashboardDevice } from './dashboard.service';
import type { LatestMeasurement } from '../../core/models/measurement.model';
import type { DashboardAlert } from '../../core/models/alert.model';
import { ParameterCard } from './parameter-card/parameter-card';

type ViewState = 'loading' | 'data' | 'empty' | 'error';
type LiveStatus = 'SUBSCRIBED' | 'RECONNECTING' | 'ERROR';

// Dashboard (RF-22 a RF-26): tarjetas de los 4 parametros, estado del
// dispositivo, alertas activas y actualizacion en vivo via Realtime.
@Component({
  selector: 'wq-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatToolbarModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    ParameterCard,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  readonly deviceControl = new FormControl<string | null>(null);

  readonly devicesState = signal<ViewState>('loading');
  readonly devices = signal<DashboardDevice[]>([]);
  readonly devicesError = signal<string | null>(null);

  readonly dataState = signal<ViewState>('loading');
  readonly dataError = signal<string | null>(null);
  readonly selectedDevice = signal<DashboardDevice | null>(null);
  readonly measurements = signal<LatestMeasurement[]>([]);
  readonly alerts = signal<DashboardAlert[]>([]);
  readonly liveStatus = signal<LiveStatus>('RECONNECTING');
  readonly lastUpdated = signal<Date | null>(null);

  private unsubscribeRealtime: (() => void) | null = null;
  private clockTimer?: ReturnType<typeof setInterval>;
  readonly nowTick = signal(Date.now());

  constructor(
    protected readonly authService: AuthService,
    private readonly router: Router,
    private readonly dashboardService: DashboardService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.clockTimer = setInterval(() => this.nowTick.set(Date.now()), 1000);

    this.deviceControl.valueChanges.subscribe((deviceId) => {
      if (deviceId) void this.selectDevice(deviceId);
    });

    await this.loadDevices();
  }

  ngOnDestroy(): void {
    this.unsubscribeRealtime?.();
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  async loadDevices(): Promise<void> {
    this.devicesState.set('loading');
    try {
      const devices = await this.dashboardService.listDevices();
      this.devices.set(devices);
      this.devicesState.set(devices.length === 0 ? 'empty' : 'data');
      if (devices.length > 0) {
        this.deviceControl.setValue(devices[0].id);
      }
    } catch (err) {
      this.devicesError.set(err instanceof Error ? err.message : 'Error al cargar los dispositivos.');
      this.devicesState.set('error');
    }
  }

  async selectDevice(deviceId: string): Promise<void> {
    this.unsubscribeRealtime?.();
    this.unsubscribeRealtime = null;

    await this.refreshData(deviceId);

    this.unsubscribeRealtime = this.dashboardService.subscribeToDevice(
      deviceId,
      () => void this.refreshData(deviceId, { silent: true }),
      (status) => this.liveStatus.set(status),
    );
  }

  async refreshData(deviceId: string, opts: { silent?: boolean } = {}): Promise<void> {
    if (!opts.silent) this.dataState.set('loading');
    try {
      const [device, parameters, rows, alerts] = await Promise.all([
        this.dashboardService.getDevice(deviceId),
        this.dashboardService.listParameters(),
        this.dashboardService.getRecentMeasurements(deviceId),
        this.dashboardService.getActiveAlerts(deviceId),
      ]);

      this.selectedDevice.set(device);
      this.measurements.set(this.dashboardService.buildLatestMeasurements(parameters, rows));
      this.alerts.set(alerts);
      this.lastUpdated.set(new Date());
      this.dataState.set(rows.length === 0 ? 'empty' : 'data');
    } catch (err) {
      this.dataError.set(err instanceof Error ? err.message : 'Error al cargar el dashboard.');
      this.dataState.set('error');
    }
  }

  secondsSinceUpdate(): number {
    const last = this.lastUpdated();
    if (!last) return 0;
    // Se lee nowTick() para que Angular recalcule este valor cada segundo.
    return Math.max(0, Math.floor((this.nowTick() - last.getTime()) / 1000));
  }

  lastSeenLabel(): string {
    const device = this.selectedDevice();
    if (!device?.last_seen_at) return 'Nunca';
    return new Date(device.last_seen_at).toLocaleString();
  }

  async logout(): Promise<void> {
    await this.authService.signOut();
    await this.router.navigateByUrl('/iniciar-sesion');
  }
}
