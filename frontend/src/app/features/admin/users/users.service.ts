import { Injectable } from '@angular/core';

import { SupabaseService } from '../../../core/supabase.service';
import type { Profile, UserRole } from '../../../core/models/profile.model';
import type { DeviceSummary } from '../../../core/models/device.model';

export interface CreateUserInput {
  email: string;
  full_name: string;
  role: UserRole;
}

export interface CreateUserResult {
  ok: boolean;
  message?: string;
}

// Acceso a datos para Administración > Usuarios (RF-06 a RF-08).
// Leer/editar perfiles va directo contra perfiles (RLS ya lo permite para
// admin); crear un usuario nuevo requiere la Edge Function
// admin-create-user porque eso necesita la service_role key (RNF-04). El
// cuerpo que recibe esa función (email/full_name/role/redirect_to) es un
// contrato interno propio, no un campo de base de datos, y se queda en
// inglés (D-021); el valor de "role" ya viaja en español porque UserRole
// ahora es 'administrador' | 'analista' | 'tecnico_campo'.
@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listProfiles(): Promise<Profile[]> {
    const { data, error } = await this.supabaseService.client
      .from('perfiles')
      .select('*')
      .order('nombre_completo', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar la lista de usuarios: ${error.message}`);
    }
    return (data ?? []) as Profile[];
  }

  async createUser(input: CreateUserInput): Promise<CreateUserResult> {
    const { data, error } = await this.supabaseService.client.functions.invoke('admin-create-user', {
      body: { ...input, redirect_to: `${window.location.origin}/restablecer-contrasena` },
    });

    if (error) {
      const message = (data as { error?: { message?: string } } | null)?.error?.message ?? error.message;
      return { ok: false, message };
    }
    return { ok: true };
  }

  async updateProfile(
    id: string,
    patch: Partial<Pick<Profile, 'nombre_completo' | 'rol' | 'is_active'>>,
  ): Promise<CreateUserResult> {
    const { error } = await this.supabaseService.client.from('perfiles').update(patch).eq('id', id);

    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }

  async listDevices(): Promise<DeviceSummary[]> {
    const { data, error } = await this.supabaseService.client
      .from('dispositivos')
      .select('id, codigo, nombre, estado')
      .order('codigo', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar la lista de dispositivos: ${error.message}`);
    }
    return (data ?? []) as DeviceSummary[];
  }

  async listAssignedDeviceIds(profileId: string): Promise<string[]> {
    const { data, error } = await this.supabaseService.client
      .from('asignaciones_dispositivo')
      .select('dispositivo_id')
      .eq('perfil_id', profileId);

    if (error) {
      throw new Error(`No se pudo cargar la asignación de dispositivos: ${error.message}`);
    }
    return (data ?? []).map((row) => row.dispositivo_id as string);
  }

  async setDeviceAssignments(profileId: string, deviceIds: string[]): Promise<CreateUserResult> {
    const client = this.supabaseService.client;

    const { error: deleteError } = await client.from('asignaciones_dispositivo').delete().eq('perfil_id', profileId);
    if (deleteError) {
      return { ok: false, message: deleteError.message };
    }

    if (deviceIds.length === 0) {
      return { ok: true };
    }

    const rows = deviceIds.map((dispositivo_id) => ({ dispositivo_id, perfil_id: profileId }));
    const { error: insertError } = await client.from('asignaciones_dispositivo').insert(rows);
    if (insertError) {
      return { ok: false, message: insertError.message };
    }
    return { ok: true };
  }
}
