import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart, type ChartConfiguration } from 'chart.js/auto';

import { HistoryService, type HistoryFilters, type HistoryRow } from './history.service';
import type { DashboardDevice } from '../dashboard/dashboard.service';
import type { Parameter } from '../../core/models/parameter.model';
import type { EvaluationResult } from '../../core/models/measurement.model';

type ViewState = 'loading' | 'data' | 'empty' | 'error';

// Historial (RF-27 a RF-29): filtros por dispositivo, ubicacion,
// parametro, estado de evaluacion y rango de fechas; tabla paginada y
// grafica de tendencia (solo cuando hay un parametro fijo seleccionado,
// para no mezclar unidades distintas en un mismo eje).
@Component({
  selector: 'wq-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './history.html',
  styleUrl: './history.scss',
})
export class History implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trendCanvas') private readonly canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly displayedColumns = ['measured_at', 'device', 'parameter', 'value', 'status'];

  readonly filtersForm = new FormGroup({
    deviceId: new FormControl<string | null>(null),
    locationId: new FormControl<string | null>(null),
    parameterId: new FormControl<string | null>(null),
    evaluationResult: new FormControl<EvaluationResult | null>(null),
    dateFrom: new FormControl<string | null>(null),
    dateTo: new FormControl<string | null>(null),
  });

  readonly devices = signal<DashboardDevice[]>([]);
  readonly locations = signal<{ id: string; name: string }[]>([]);
  readonly parameters = signal<Parameter[]>([]);

  readonly state = signal<ViewState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly rows = signal<HistoryRow[]>([]);
  readonly total = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize: number;

  private chart?: Chart;
  private viewReady = false;

  constructor(private readonly historyService: HistoryService) {
    this.pageSize = historyService.pageSize;
  }

  async ngOnInit(): Promise<void> {
    const [devices, locations, parameters] = await Promise.all([
      this.historyService.listDevices(),
      this.historyService.listLocations(),
      this.historyService.listParameters(),
    ]);
    this.devices.set(devices);
    this.locations.set(locations);
    this.parameters.set(parameters);

    this.filtersForm.valueChanges.subscribe(() => {
      this.pageIndex.set(0);
      void this.load();
    });

    await this.load();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private currentFilters(): HistoryFilters {
    const raw = this.filtersForm.getRawValue();
    return {
      deviceId: raw.deviceId,
      locationId: raw.locationId,
      parameterId: raw.parameterId,
      evaluationResult: raw.evaluationResult,
      dateFrom: raw.dateFrom ? new Date(raw.dateFrom).toISOString() : null,
      dateTo: raw.dateTo ? new Date(raw.dateTo + 'T23:59:59').toISOString() : null,
    };
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const filters = this.currentFilters();
      const [page, trend] = await Promise.all([
        this.historyService.queryPage(filters, this.pageIndex()),
        this.historyService.queryTrend(filters),
      ]);
      this.rows.set(page.rows);
      this.total.set(page.total);
      this.state.set(page.rows.length === 0 ? 'empty' : 'data');
      this.renderTrend(trend);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al cargar el historial.');
      this.state.set('error');
    }
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    void this.load();
  }

  clearFilters(): void {
    this.filtersForm.reset();
  }

  private renderTrend(points: { measured_at: string; value: number }[]): void {
    if (!this.viewReady || !this.canvasRef) return;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: points.map((p) => new Date(p.measured_at).toLocaleString()),
        datasets: [
          {
            data: points.map((p) => p.value),
            borderColor: '#0f7d72',
            backgroundColor: '#0f7d7222',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        scales: { x: { display: false } },
        plugins: { legend: { display: false } },
      },
    };

    if (this.chart) {
      this.chart.data = config.data;
      this.chart.options = config.options!;
      this.chart.update('none');
    } else {
      this.chart = new Chart(this.canvasRef.nativeElement, config);
    }
  }
}
