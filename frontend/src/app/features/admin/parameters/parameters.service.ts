import { Injectable } from '@angular/core';

import { SupabaseService } from '../../../core/supabase.service';
import type { Parameter } from '../../../core/models/parameter.model';

export interface ServiceResult {
  ok: boolean;
  message?: string;
}

// Acceso a datos para Administración > Parámetros (RF-15). Sin alta ni
// baja a propósito (ver core/models/parameter.model.ts): solo edición de
// metadatos y activo/inactivo sobre el catálogo fijo de 4 parámetros.
@Injectable({ providedIn: 'root' })
export class ParametersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listParameters(): Promise<Parameter[]> {
    const { data, error } = await this.supabaseService.client
      .from('parameters')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar el catálogo de parámetros: ${error.message}`);
    }
    return (data ?? []) as Parameter[];
  }

  async updateParameter(
    id: string,
    patch: Partial<Pick<Parameter, 'name' | 'unit' | 'physical_min' | 'physical_max' | 'is_active'>>,
  ): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.from('parameters').update(patch).eq('id', id);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }
}
