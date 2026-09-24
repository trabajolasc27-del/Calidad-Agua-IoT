import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Chart } from 'chart.js/auto';

import { DashboardService, type DashboardDevice } from './dashboard.service';
import type { LatestMeasurement } from '../../core/models/measurement.model';
import type { DashboardAlert } from '../../core/models/alert.model';
import { ParameterCard } from './parameter-card/parameter-card';

type ViewState = 'loading' | 'data' | 'empty' | 'error';
type LiveStatus = 'SUBSCRIBED' | 'RECONNECTING' | 'ERROR';

/**
 * Que es: pantalla principal (RF-22 a RF-26). Muestra las 4 caratulas de
 * parametro del dispositivo seleccionado, su estado, sus alertas activas
 * y una mini-grafica de tendencia por parametro, todo actualizandose solo
 * via Supabase Realtime.
 *
 * Como funciona: selectDevice() se suscribe a INSERT en lotes_medicion y
 * a cualquier cambio en alertas del dispositivo elegido (ver
 * DashboardService.subscribeToDevice); cada evento dispara refreshData en
 * modo "silencioso" (sin mostrar el spinner de carga completa) para que
 * la pantalla se sienta viva sin parpadear. Al cambiar de dispositivo se
 * cancela la suscripcion anterior antes de crear la nueva.
 */
@Component({
  selector: 'wq-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatSelectModule, MatProgressSpinnerModule, MatIconModule, ParameterCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('trendCanvas') private readonly canvasRefs?: QueryList<ElementRef<HTMLCanvasElement>>;

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

  private readonly trendCharts: Chart[] = [];
  private viewReady = false;

  constructor(private readonly dashboardService: DashboardService) {}

  async ngOnInit(): Promise<void> {
    this.clockTimer = setInterval(() => this.nowTick.set(Date.now()), 1000);

    this.deviceControl.valueChanges.subscribe((deviceId) => {
      if (deviceId) void this.selectDevice(deviceId);
    });

    await this.loadDevices();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  ngOnDestroy(): void {
    this.unsubscribeRealtime?.();
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.destroyTrendCharts();
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
      const [device, parameters, rows, alerts, thresholds] = await Promise.all([
        this.dashboardService.getDevice(deviceId),
        this.dashboardService.listParameters(),
        this.dashboardService.getRecentMeasurements(deviceId),
        this.dashboardService.getActiveAlerts(deviceId),
        this.dashboardService.listActiveThresholds(),
      ]);

      this.selectedDevice.set(device);
      const measurements = this.dashboardService.buildLatestMeasurements(parameters, rows, thresholds);
      this.measurements.set(measurements);
      this.alerts.set(alerts);
      this.lastUpdated.set(new Date());
      this.dataState.set(rows.length === 0 ? 'empty' : 'data');
      // Los <canvas> del @for recien se crean cuando dataState pasa a
      // 'data'; se espera un tick para que Angular los pinte antes de
      // buscarlos por ViewChildren (mismo patron que Reports).
      setTimeout(() => this.renderTrendCharts(measurements), 0);
    } catch (err) {
      this.dataError.set(err instanceof Error ? err.message : 'Error al cargar el dashboard.');
      this.dataState.set('error');
    }
  }

  private destroyTrendCharts(): void {
    for (const chart of this.trendCharts) chart.destroy();
    this.trendCharts.length = 0;
  }

  private renderTrendCharts(measurements: LatestMeasurement[]): void {
    if (!this.viewReady || !this.canvasRefs) return;
    this.destroyTrendCharts();

    const canvases = this.canvasRefs.toArray();
    measurements.forEach((m, i) => {
      const canvasRef = canvases[i];
      if (!canvasRef || m.trend.length === 0) return;

      const color = m.evaluation_result === 'CRITICO' ? '#b23b3b' : m.evaluation_result === 'ALERTA' ? '#9c6d0a' : '#0f7d72';

      const chart = new Chart(canvasRef.nativeElement, {
        type: 'line',
        data: {
          labels: m.trend.map((_, idx) => String(idx)),
          datasets: [
            {
              data: m.trend,
              borderColor: color,
              backgroundColor: `${color}22`,
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.35,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          scales: { x: { display: false }, y: { display: false } },
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
      });
      this.trendCharts.push(chart);
    });
  }

  secondsSinceUpdate(): number {
    const last = this.lastUpdated();
    if (!last) return 0;
    // Se lee nowTick() para que Angular recalcule este valor cada segundo.
    return Math.max(0, Math.floor((this.nowTick() - last.getTime()) / 1000));
  }

  lastSeenLabel(): string {
    const device = this.selectedDevice();
    if (!device?.ultima_comunicacion) return 'Nunca';
    return new Date(device.ultima_comunicacion).toLocaleString();
  }
}
