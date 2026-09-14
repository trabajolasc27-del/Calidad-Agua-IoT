import { Injectable } from '@angular/core';

import { SupabaseService } from '../../core/supabase.service';

export interface MapDevice {
  id: string;
  codigo: string;
  nombre: string;
  estado: 'activo' | 'inactivo';
  ultima_comunicacion: string | null;
}

export interface MapLocation {
  id: string;
  nombre: string;
  descripcion: string | null;
  latitud: number;
  longitud: number;
  dispositivos: MapDevice[];
}

// Mapa general de solo lectura para todos los roles (RF-10). RLS ya
// limita que dispositivos ve cada quien (un tecnico de campo solo ve los
// suyos); esta pantalla no agrega ninguna restriccion propia.
@Injectable({ providedIn: 'root' })
export class MapService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listLocationsWithDevices(): Promise<MapLocation[]> {
    const { data, error } = await this.supabaseService.client
      .from('ubicaciones')
      .select('id, nombre, descripcion, latitud, longitud, dispositivos(id, codigo, nombre, estado, ultima_comunicacion)')
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar el mapa: ${error.message}`);
    }
    return (data ?? []) as MapLocation[];
  }
}
