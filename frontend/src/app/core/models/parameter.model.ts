// Refleja public.parametros (ver docs/DATABASE_DESIGN.md 3.6).
// Catalogo de los 4 parametros oficiales (D-001/D-002 en DECISIONS.md):
// no se exponen alta ni baja en la interfaz a proposito, para no abrir
// la puerta a agregar parametros fuera del alcance (p. ej. gases) sin
// pasar por una decision explicita documentada.

export interface Parameter {
  id: string;
  codigo: string;
  nombre: string;
  unidad: string;
  minimo_fisico: number | null;
  maximo_fisico: number | null;
  is_active: boolean;
}
