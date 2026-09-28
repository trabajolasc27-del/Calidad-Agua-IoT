import type { EvaluationResult } from '../core/models/measurement.model';
import type { AlertSeverity, AlertStatus } from '../core/models/alert.model';
import type { DeviceStatus } from '../core/models/device.model';

export type StatusTone = 'ok' | 'warn' | 'crit' | 'neutral' | 'info';

export interface StatusMeta {
  tone: StatusTone;
  label: string;
  icon: string;
}

// Un solo lugar para el mapeo icono+texto+color de cada "tipo de estado"
// que aparece repetido en Dashboard/Historial/Alertas/Reportes/Mapa
// (evaluación de medición, gravedad y estado de alerta, estado de
// dispositivo). Antes cada pantalla repetía su propio @switch con los
// mismos 3-4 casos; centralizarlo evita que una quede desincronizada del
// resto al agregar o renombrar un caso.
export function evaluationStatus(result: EvaluationResult | null | undefined): StatusMeta {
  switch (result) {
    case 'CONFORME':
      return { tone: 'ok', label: 'Conforme', icon: 'check_circle' };
    case 'ALERTA':
      return { tone: 'warn', label: 'Alerta', icon: 'warning' };
    case 'CRITICO':
      return { tone: 'crit', label: 'Crítico', icon: 'error' };
    default:
      return { tone: 'neutral', label: 'Sin evaluar', icon: 'help_outline' };
  }
}

export function alertSeverityStatus(severity: AlertSeverity): StatusMeta {
  return severity === 'CRITICO'
    ? { tone: 'crit', label: 'Crítico', icon: 'error' }
    : { tone: 'warn', label: 'Alerta', icon: 'warning' };
}

// Traduccion visual del flujo NUEVA -> RECONOCIDA -> ATENDIDA -> CERRADA.
// Los valores en si ya viven en español en la base de datos (D-021,
// requisito de tramites institucionales), asi que esto no traduce un valor
// interno en ingles -- solo centraliza el icono y tono de cada paso del
// flujo, que antes cada plantilla repetia con su propio @switch/@if.
export function alertStatusMeta(status: AlertStatus): StatusMeta {
  switch (status) {
    case 'NUEVA':
      return { tone: 'crit', label: 'Nueva', icon: 'fiber_new' };
    case 'RECONOCIDA':
      return { tone: 'warn', label: 'Reconocida', icon: 'visibility' };
    case 'ATENDIDA':
      return { tone: 'info', label: 'Atendida', icon: 'build' };
    case 'CERRADA':
      return { tone: 'neutral', label: 'Cerrada', icon: 'task_alt' };
  }
}

export function deviceStatusMeta(status: DeviceStatus): StatusMeta {
  return status === 'activo'
    ? { tone: 'ok', label: 'Activo', icon: 'check_circle' }
    : { tone: 'neutral', label: 'Inactivo', icon: 'pause_circle' };
}
