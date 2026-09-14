// Refleja public.ubicaciones (ver docs/DATABASE_DESIGN.md 3.2).

export interface LocationSummary {
  id: string;
  nombre: string;
}

export interface Location {
  id: string;
  nombre: string;
  descripcion: string | null;
  latitud: number;
  longitud: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  // Viene de un embed de PostgREST (ubicaciones -> dispositivos(count)).
  dispositivos?: { count: number }[];
}
