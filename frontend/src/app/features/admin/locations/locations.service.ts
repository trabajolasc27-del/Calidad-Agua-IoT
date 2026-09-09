import { Injectable } from '@angular/core';

import { SupabaseService } from '../../../core/supabase.service';
import type { Location } from '../../../core/models/location.model';

export interface LocationInput {
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
}

export interface ServiceResult {
  ok: boolean;
  message?: string;
}

// Acceso a datos para Administración > Ubicaciones (RF-09). El mapa
// general de solo lectura (RF-10) para todos los roles llega con el
// Dashboard en la Fase 3; esto es el CRUD de administrador.
@Injectable({ providedIn: 'root' })
export class LocationsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listLocations(): Promise<Location[]> {
    const { data, error } = await this.supabaseService.client
      .from('locations')
      .select('*, devices(count)')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar la lista de ubicaciones: ${error.message}`);
    }
    return (data ?? []) as Location[];
  }

  async createLocation(input: LocationInput): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.from('locations').insert(input);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }

  async updateLocation(id: string, input: LocationInput): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.from('locations').update(input).eq('id', id);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }

  async deleteLocation(id: string): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.from('locations').delete().eq('id', id);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }
}
