import type { Parameter } from './parameter.model';

export type EvaluationResult = 'CONFORME' | 'ALERTA' | 'CRITICO';

export interface LatestMeasurement {
  parameter: Parameter;
  value: number | null;
  evaluation_result: EvaluationResult | null;
  measured_at: string | null;
  trend: number[]; // valores mas recientes primero -> se invierte para graficar
}
