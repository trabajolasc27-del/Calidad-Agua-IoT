import { Injectable } from '@angular/core';

import { SupabaseService } from '../../core/supabase.service';

export interface MapDevice {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  last_seen_at: string | null;
}

export interface MapLocation {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  devices: MapDevice[];
}

// Mapa general de solo lectura para todos los roles (RF-10). RLS ya
// limita que dispositivos ve cada quien (un tecnico de campo solo ve los
// suyos); esta pantalla no agrega ninguna restriccion propia.
@Injectable({ providedIn: 'root' })
export class MapService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listLocationsWithDevices(): Promise<MapLocation[]> {
    const { data, error } = await this.supabaseService.client
      .from('locations')
      .select('id, name, description, latitude, longitude, devices(id, code, name, status, last_seen_at)')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar el mapa: ${error.message}`);
    }
    return (data ?? []) as MapLocation[];
  }
}
