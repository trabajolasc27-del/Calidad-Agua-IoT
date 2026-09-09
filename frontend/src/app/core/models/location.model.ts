// Subconjunto de public.locations usado para seleccionar ubicacion al
// dar de alta un dispositivo. El CRUD completo de Ubicaciones llega en
// la siguiente pantalla de Administracion.

export interface LocationSummary {
  id: string;
  name: string;
}
