import { Component, computed, input } from '@angular/core';

import type { EvaluationResult } from '../../core/models/measurement.model';

/**
 * Que es: carátula tipo velocímetro (semicírculo con aguja) para mostrar
 * la última lectura de un parámetro contra sus umbrales reales.
 *
 * Por qué existe: el asesor externo del usuario pidió una interfaz con
 * "carácter propio" inspirada en un panel IoT de referencia que usa este
 * tipo de widget por sensor. En vez de una librería de gráficas (chart.js
 * ya se usa en History/Reports para líneas de tendencia, pero un gauge es
 * geometría fija y simple), se dibuja el arco a mano con SVG: es más
 * liviano y permite pintar las bandas exactas de cada umbral en vez de
 * colores genéricos.
 *
 * Cómo funciona: el arco va de -90° (límite físico mínimo, extremo
 * izquierdo) a +90° (límite físico máximo, extremo derecho), pasando por
 * 0° arriba. Se parte en hasta 5 franjas de color según los 4 límites del
 * umbral activo del parámetro (crítico bajo/alerta bajo/alerta alto/
 * crítico alto — cualquiera puede venir null si no hay límite en esa
 * dirección, igual que en el motor de evaluación real, ver
 * evaluar_valor_medicion en D-021). La aguja apunta al valor actual
 * interpolado linealmente en ese mismo rango de ángulos.
 */
@Component({
  selector: 'wq-gauge',
  standalone: true,
  templateUrl: './gauge.html',
  styleUrl: './gauge.scss',
})
export class Gauge {
  readonly valor = input<number | null>(null);
  readonly unidad = input<string>('');
  readonly minimo = input<number>(0);
  readonly maximo = input<number>(100);
  readonly criticoBajo = input<number | null>(null);
  readonly alertaBajo = input<number | null>(null);
  readonly alertaAlto = input<number | null>(null);
  readonly criticoAlto = input<number | null>(null);
  readonly resultado = input<EvaluationResult | null>(null);

  private static readonly CX = 110;
  private static readonly CY = 112;
  private static readonly R = 88;
  private static readonly NEEDLE_R = 74;

  /** Convierte un valor del rango físico a un ángulo de -90 (min) a 90 (max). */
  private angleFor(value: number): number {
    const min = this.minimo();
    const max = this.maximo();
    if (max <= min) return -90;
    const clamped = Math.min(max, Math.max(min, value));
    const fraction = (clamped - min) / (max - min);
    return -90 + fraction * 180;
  }

  private static polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  private static describeArc(startAngle: number, endAngle: number): string {
    if (endAngle <= startAngle) return '';
    const start = Gauge.polarToCartesian(Gauge.CX, Gauge.CY, Gauge.R, endAngle);
    const end = Gauge.polarToCartesian(Gauge.CX, Gauge.CY, Gauge.R, startAngle);
    return `M ${start.x} ${start.y} A ${Gauge.R} ${Gauge.R} 0 0 0 ${end.x} ${end.y}`;
  }

  /**
   * Franjas de color del arco. El orden de prioridad replica exactamente
   * evaluar_valor_medicion(): bajo el crítico-bajo es CRITICO, entre
   * crítico-bajo y alerta-bajo es ALERTA, entre alerta-bajo y alerta-alto
   * es CONFORME, y simétrico arriba. Un límite en null significa "sin
   * tope en esa dirección", igual que en la base de datos.
   */
  readonly bands = computed(() => {
    const min = this.minimo();
    const max = this.maximo();
    const cb = this.criticoBajo();
    const ab = this.alertaBajo();
    const aa = this.alertaAlto();
    const ca = this.criticoAlto();

    const okFrom = ab ?? min;
    const okTo = aa ?? max;

    const segments: { from: number; to: number; cls: 'crit' | 'warn' | 'ok' }[] = [];

    if (cb !== null && cb > min) {
      segments.push({ from: min, to: cb, cls: 'crit' });
    }
    if (ab !== null && ab > (cb ?? min)) {
      segments.push({ from: cb ?? min, to: ab, cls: 'warn' });
    }
    segments.push({ from: Math.max(min, okFrom), to: Math.min(max, okTo), cls: 'ok' });
    if (aa !== null) {
      if (ca !== null && ca > aa) {
        segments.push({ from: aa, to: ca, cls: 'warn' });
      } else if (ca === null && max > aa) {
        segments.push({ from: aa, to: max, cls: 'warn' });
      }
    }
    if (ca !== null && max > ca) {
      segments.push({ from: ca, to: max, cls: 'crit' });
    }

    return segments.map((s) => ({
      cls: s.cls,
      d: Gauge.describeArc(this.angleFor(s.from), this.angleFor(s.to)),
    }));
  });

  readonly needlePoint = computed(() => {
    const v = this.valor();
    const angle = v === null ? -90 : this.angleFor(v);
    return Gauge.polarToCartesian(Gauge.CX, Gauge.CY, Gauge.NEEDLE_R, angle);
  });

  readonly center = { x: Gauge.CX, y: Gauge.CY };

  readonly statusMeta = computed(() => {
    switch (this.resultado()) {
      case 'CONFORME':
        return { cls: 'ok', label: 'Conforme', icon: 'check_circle' };
      case 'ALERTA':
        return { cls: 'warn', label: 'Alerta', icon: 'warning' };
      case 'CRITICO':
        return { cls: 'crit', label: 'Crítico', icon: 'error' };
      default:
        return { cls: 'neutral', label: 'Sin evaluar', icon: 'help_outline' };
    }
  });
}
