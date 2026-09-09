// Refleja public.locations (ver docs/DATABASE_DESIGN.md 3.2).

export interface LocationSummary {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  // Viene de un embed de PostgREST (locations -> devices(count)).
  devices?: { count: number }[];
}
