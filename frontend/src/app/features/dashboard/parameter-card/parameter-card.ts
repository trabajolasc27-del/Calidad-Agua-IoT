import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Chart, type ChartConfiguration } from 'chart.js/auto';

import type { LatestMeasurement } from '../../../core/models/measurement.model';

const STATUS_META = {
  CONFORME: { cls: 'ok', label: 'Conforme', icon: 'check_circle', color: '#2f8f4e' },
  ALERTA: { cls: 'warn', label: 'Alerta', icon: 'warning', color: '#9c6d0a' },
  CRITICO: { cls: 'crit', label: 'Crítico', icon: 'error', color: '#b23b3b' },
} as const;

// Tarjeta de un parametro en el Dashboard (RF-22): valor actual,
// semaforizacion (texto + icono + color, nunca solo color, RNF-02) y una
// mini grafica de tendencia reciente (RF-24).
@Component({
  selector: 'wq-parameter-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './parameter-card.html',
  styleUrl: './parameter-card.scss',
})
export class ParameterCard implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) measurement!: LatestMeasurement;
  @ViewChild('sparkline') private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;
  private viewReady = false;

  get statusMeta() {
    if (!this.measurement.evaluation_result) {
      return { cls: 'neutral', label: 'Sin evaluar', icon: 'help_outline', color: '#8a9c9d' };
    }
    return STATUS_META[this.measurement.evaluation_result];
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['measurement'] && this.viewReady) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    const trend = this.measurement.trend;
    if (!this.canvasRef) return;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: trend.map((_, i) => String(i)),
        datasets: [
          {
            data: trend,
            borderColor: this.statusMeta.color,
            backgroundColor: `${this.statusMeta.color}22`,
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
