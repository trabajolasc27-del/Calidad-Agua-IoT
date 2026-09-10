import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, ViewChildren, type QueryList, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Chart } from 'chart.js/auto';
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import ExcelJS from 'exceljs';

import { ReportsService, type ReportData } from './reports.service';
import type { DashboardDevice } from '../dashboard/dashboard.service';

const pdfMake = pdfMakeModule as unknown as { vfs: unknown; createPdf: (doc: TDocumentDefinitions) => { download: (fileName?: string) => void } };
pdfMake.vfs = pdfFontsModule;

type ViewState = 'idle' | 'loading' | 'data' | 'empty' | 'error';

// Reportes (RF-37 a RF-39): estadisticas por parametro (min/max/promedio),
// conteo de alertas y grafica de tendencia para un dispositivo y periodo,
// con exportacion a PDF (pdfmake) y Excel (ExcelJS).
@Component({
  selector: 'wq-reports',
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
    MatProgressSpinnerModule,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports implements AfterViewInit, OnDestroy {
  @ViewChildren('trendCanvas') private readonly canvasRefs?: QueryList<ElementRef<HTMLCanvasElement>>;

  readonly filtersForm = new FormGroup({
    deviceId: new FormControl<string | null>(null, Validators.required),
    dateFrom: new FormControl<string | null>(null, Validators.required),
    dateTo: new FormControl<string | null>(null, Validators.required),
  });

  readonly devices = signal<DashboardDevice[]>([]);
  readonly state = signal<ViewState>('idle');
  readonly errorMessage = signal<string | null>(null);
  readonly report = signal<ReportData | null>(null);
  readonly truncated = signal(false);
  readonly exporting = signal(false);

  private readonly charts: Chart[] = [];
  private viewReady = false;

  constructor(private readonly reportsService: ReportsService) {
    void this.loadDevices();
  }

  private async loadDevices(): Promise<void> {
    try {
      this.devices.set(await this.reportsService.listDevices());
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al cargar los dispositivos.');
      this.state.set('error');
    }
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  async generate(): Promise<void> {
    if (this.filtersForm.invalid) {
      this.filtersForm.markAllAsTouched();
      return;
    }
    const raw = this.filtersForm.getRawValue();
    const device = this.devices().find((d) => d.id === raw.deviceId);
    if (!device) return;

    const dateFromIso = new Date(raw.dateFrom!).toISOString();
    const dateToIso = new Date(raw.dateTo! + 'T23:59:59').toISOString();

    this.state.set('loading');
    try {
      const { report, truncated } = await this.reportsService.buildReport(device, dateFromIso, dateToIso);
      this.report.set(report);
      this.truncated.set(truncated);
      this.state.set(report.parameterStats.length === 0 ? 'empty' : 'data');
      setTimeout(() => this.renderTrends(report), 0);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al generar el reporte.');
      this.state.set('error');
    }
  }

  private destroyCharts(): void {
    for (const chart of this.charts) chart.destroy();
    this.charts.length = 0;
  }

  private renderTrends(report: ReportData): void {
    if (!this.viewReady || !this.canvasRefs) return;
    this.destroyCharts();

    const canvases = this.canvasRefs.toArray();
    report.parameterStats.forEach((stats, i) => {
      const canvasRef = canvases[i];
      if (!canvasRef || stats.trend.length === 0) return;

      const chart = new Chart(canvasRef.nativeElement, {
        type: 'line',
        data: {
          labels: stats.trend.map((p) => new Date(p.measured_at).toLocaleDateString()),
          datasets: [
            {
              data: stats.trend.map((p) => p.value),
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
      });
      this.charts.push(chart);
    });
  }

  exportPdf(): void {
    const report = this.report();
    if (!report) return;
    this.exporting.set(true);
    try {
      const doc: TDocumentDefinitions = {
        content: [
          { text: 'Reporte de calidad del agua', style: 'title' },
          { text: `Dispositivo: ${report.device.code} — ${report.device.name}`, margin: [0, 8, 0, 0] },
          { text: `Periodo: ${this.formatDate(report.dateFrom)} a ${this.formatDate(report.dateTo)}` },
          { text: `Mediciones totales: ${report.totalMeasurements}    Alertas abiertas en el periodo: ${report.alertsOpened}`, margin: [0, 0, 0, 12] },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: [
                ['Parámetro', 'Unidad', 'Mín', 'Máx', 'Promedio', 'Lecturas', 'Alertas/Críticos'],
                ...report.parameterStats.map((s) => [
                  s.name,
                  s.unit,
                  s.min?.toString() ?? '—',
                  s.max?.toString() ?? '—',
                  s.avg?.toString() ?? '—',
                  s.count.toString(),
                  `${s.alertCount} / ${s.criticalCount}`,
                ]),
              ],
            },
          },
          {
            text: 'Este reporte no constituye una certificación de potabilidad ni una declaración de cumplimiento normativo (NOM-001 u otra).',
            style: 'disclaimer',
            margin: [0, 16, 0, 0],
          },
        ],
        styles: {
          title: { fontSize: 16, bold: true },
          disclaimer: { fontSize: 8, italics: true, color: '#666666' },
        },
        defaultStyle: { fontSize: 10 },
      };

      pdfMake.createPdf(doc).download(`reporte-${report.device.code}-${this.formatDate(report.dateFrom)}.pdf`);
    } finally {
      this.exporting.set(false);
    }
  }

  async exportExcel(): Promise<void> {
    const report = this.report();
    if (!report) return;
    this.exporting.set(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Estadísticas');
      sheet.addRow(['Reporte de calidad del agua']);
      sheet.addRow([`Dispositivo: ${report.device.code} — ${report.device.name}`]);
      sheet.addRow([`Periodo: ${this.formatDate(report.dateFrom)} a ${this.formatDate(report.dateTo)}`]);
      sheet.addRow([`Mediciones totales: ${report.totalMeasurements}`, `Alertas abiertas: ${report.alertsOpened}`]);
      sheet.addRow([]);

      const header = sheet.addRow(['Parámetro', 'Unidad', 'Mín', 'Máx', 'Promedio', 'Lecturas', 'Alertas', 'Críticos']);
      header.font = { bold: true };

      for (const s of report.parameterStats) {
        sheet.addRow([s.name, s.unit, s.min, s.max, s.avg, s.count, s.alertCount, s.criticalCount]);
      }
      sheet.columns.forEach((col) => (col.width = 16));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${report.device.code}-${this.formatDate(report.dateFrom)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      this.exporting.set(false);
    }
  }

  private formatDate(iso: string): string {
    return iso.slice(0, 10);
  }
}
