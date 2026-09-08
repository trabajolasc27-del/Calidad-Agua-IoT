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
// Leer/editar perfiles va directo contra profiles (RLS ya lo permite para
// admin); crear un usuario nuevo requiere la Edge Function
// admin-create-user porque eso necesita la service_role key (RNF-04).
@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listProfiles(): Promise<Profile[]> {
    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

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
    patch: Partial<Pick<Profile, 'full_name' | 'role' | 'is_active'>>,
  ): Promise<CreateUserResult> {
    const { error } = await this.supabaseService.client.from('profiles').update(patch).eq('id', id);

    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }

  async listDevices(): Promise<DeviceSummary[]> {
    const { data, error } = await this.supabaseService.client
      .from('devices')
      .select('id, code, name, status')
      .order('code', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar la lista de dispositivos: ${error.message}`);
    }
    return (data ?? []) as DeviceSummary[];
  }

  async listAssignedDeviceIds(profileId: string): Promise<string[]> {
    const { data, error } = await this.supabaseService.client
      .from('device_assignments')
      .select('device_id')
      .eq('profile_id', profileId);

    if (error) {
      throw new Error(`No se pudo cargar la asignación de dispositivos: ${error.message}`);
    }
    return (data ?? []).map((row) => row.device_id as string);
  }

  async setDeviceAssignments(profileId: string, deviceIds: string[]): Promise<CreateUserResult> {
    const client = this.supabaseService.client;

    const { error: deleteError } = await client.from('device_assignments').delete().eq('profile_id', profileId);
    if (deleteError) {
      return { ok: false, message: deleteError.message };
    }

    if (deviceIds.length === 0) {
      return { ok: true };
    }

    const rows = deviceIds.map((device_id) => ({ device_id, profile_id: profileId }));
    const { error: insertError } = await client.from('device_assignments').insert(rows);
    if (insertError) {
      return { ok: false, message: insertError.message };
    }
    return { ok: true };
  }
}
