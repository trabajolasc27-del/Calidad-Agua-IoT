// Refleja public.umbrales (ver docs/DATABASE_DESIGN.md 3.7).

export interface Threshold {
  id: string;
  parametro_id: string;
  version: number;
  critico_bajo: number | null;
  alerta_bajo: number | null;
  alerta_alto: number | null;
  critico_alto: number | null;
  lecturas_consecutivas_alerta: number;
  is_active: boolean;
  is_demo: boolean;
  creado_por: string | null;
  created_at: string;
}
