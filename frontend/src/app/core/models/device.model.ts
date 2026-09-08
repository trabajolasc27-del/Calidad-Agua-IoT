// Subconjunto de public.devices usado por la administración de usuarios
// (asignación de dispositivos a técnicos de campo, RF-08). El modelo
// completo llega cuando se construya la pantalla de Dispositivos.

export type DeviceStatus = 'active' | 'inactive';

export interface DeviceSummary {
  id: string;
  code: string;
  name: string;
  status: DeviceStatus;
}
