// Refleja public.devices (ver docs/DATABASE_DESIGN.md 3.3).

export type DeviceStatus = 'active' | 'inactive';

export interface DeviceSummary {
  id: string;
  code: string;
  name: string;
  status: DeviceStatus;
}

export interface Device {
  id: string;
  code: string;
  name: string;
  location_id: string | null;
  status: DeviceStatus;
  last_seen_at: string | null;
  firmware_version: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  // Viene de un embed de PostgREST (devices -> locations); null si no
  // tiene ubicación asignada o el embed no se pidió.
  locations?: { name: string } | null;
}
