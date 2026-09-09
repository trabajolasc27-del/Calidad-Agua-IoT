// Refleja public.parameters (ver docs/DATABASE_DESIGN.md 3.6).
// Catalogo de los 4 parametros oficiales (D-001/D-002 en DECISIONS.md):
// no se exponen alta ni baja en la interfaz a proposito, para no abrir
// la puerta a agregar parametros fuera del alcance (p. ej. gases) sin
// pasar por una decision explicita documentada.

export interface Parameter {
  id: string;
  code: string;
  name: string;
  unit: string;
  physical_min: number | null;
  physical_max: number | null;
  is_active: boolean;
}
