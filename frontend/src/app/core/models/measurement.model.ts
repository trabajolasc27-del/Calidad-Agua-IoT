import type { Parameter } from './parameter.model';
import type { Threshold } from './threshold.model';

export type EvaluationResult = 'CONFORME' | 'ALERTA' | 'CRITICO';

export interface LatestMeasurement {
  parameter: Parameter;
  value: number | null;
  evaluation_result: EvaluationResult | null;
  measured_at: string | null;
  trend: number[]; // valores mas recientes primero -> se invierte para graficar
  // Umbral activo al momento de construir esta vista (no necesariamente el
  // mismo con el que se evaluo la ultima lectura si cambio despues) -- se
  // usa solo para dibujar las bandas de la carateula (wq-gauge), la
  // evaluacion real siempre viene de evaluation_result.
  threshold: Threshold | null;
}
