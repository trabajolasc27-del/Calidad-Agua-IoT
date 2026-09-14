export type AlertSeverity = 'ALERTA' | 'CRITICO';
export type AlertStatus = 'NUEVA' | 'RECONOCIDA' | 'ATENDIDA' | 'CERRADA';

export interface DashboardAlert {
  id: string;
  nombre_parametro: string;
  valor: number | null;
  unidad: string | null;
  gravedad: AlertSeverity;
  estado: AlertStatus;
  abierta_en: string;
}

export interface Alert {
  id: string;
  dispositivo_id: string;
  parametro_id: string;
  gravedad: AlertSeverity;
  estado: AlertStatus;
  abierta_en: string;
  reconocida_en: string | null;
  reconocida_por: string | null;
  atendida_en: string | null;
  atendida_por: string | null;
  cerrada_en: string | null;
  cerrada_por: string | null;
  comentario_seguimiento: string | null;
  dispositivos: { codigo: string; nombre: string } | null;
  parametros: { nombre: string; unidad: string } | null;
  // Medicion que origino la alerta (RF-32: la lista/detalle debe mostrar
  // el valor detectado, no solo el parametro y la gravedad).
  mediciones: { valor: number } | null;
}

export interface AlertHistoryEntry {
  id: string;
  estado_origen: AlertStatus | null;
  estado_destino: AlertStatus;
  comentario: string | null;
  cambiado_en: string;
  perfiles: { nombre_completo: string | null } | null;
}
