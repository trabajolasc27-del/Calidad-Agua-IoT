// Refleja public.calibraciones y public.registros_mantenimiento
// (ver supabase/migrations/20260901120500_maintenance_and_notifications.sql
// y su rename a español en 20260914120000_spanish_rename.sql).

export type MaintenanceType = 'CALIBRACION' | 'MANTENIMIENTO';

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  CALIBRACION: 'Calibración',
  MANTENIMIENTO: 'Mantenimiento',
};

export interface Calibration {
  id: string;
  dispositivo_id: string;
  parametro_id: string | null;
  realizada_en: string;
  realizada_por: string | null;
  notas: string | null;
  proxima_fecha: string | null;
  dispositivos?: { codigo: string; nombre: string } | null;
  parametros?: { nombre: string } | null;
  perfiles?: { nombre_completo: string | null } | null;
}

export interface MaintenanceRecord {
  id: string;
  dispositivo_id: string;
  tipo: MaintenanceType;
  realizado_en: string;
  realizado_por: string | null;
  notas: string | null;
  proxima_fecha: string | null;
  dispositivos?: { codigo: string; nombre: string } | null;
  perfiles?: { nombre_completo: string | null } | null;
}

// Vista combinada usada por la pantalla de Mantenimiento: calibraciones y
// registros de mantenimiento comparten la misma forma visual (evento sobre
// un dispositivo, con fecha, responsable, notas y proxima fecha), asi que
// se listan juntos ordenados por fecha en vez de en dos tablas separadas.
export interface MaintenanceEvent {
  id: string;
  kind: 'calibracion' | 'mantenimiento';
  tipoLabel: string;
  dispositivo: { codigo: string; nombre: string } | null;
  parametro: string | null;
  fecha: string;
  responsable: string | null;
  notas: string | null;
  proximaFecha: string | null;
}
