// Refleja public.dispositivos (ver docs/DATABASE_DESIGN.md 3.3).

export type DeviceStatus = 'activo' | 'inactivo';

export interface DeviceSummary {
  id: string;
  codigo: string;
  nombre: string;
  estado: DeviceStatus;
}

export interface Device {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion_id: string | null;
  estado: DeviceStatus;
  ultima_comunicacion: string | null;
  version_firmware: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  // Viene de un embed de PostgREST (dispositivos -> ubicaciones); null si no
  // tiene ubicación asignada o el embed no se pidió.
  ubicaciones?: { nombre: string } | null;
}
