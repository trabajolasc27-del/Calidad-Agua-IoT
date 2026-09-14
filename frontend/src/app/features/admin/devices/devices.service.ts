import { Injectable } from '@angular/core';

import { SupabaseService } from '../../../core/supabase.service';
import type { Device, DeviceStatus } from '../../../core/models/device.model';
import type { LocationSummary } from '../../../core/models/location.model';

export interface CreateDeviceInput {
  codigo: string;
  nombre: string;
  ubicacion_id: string | null;
}

export interface ServiceResult {
  ok: boolean;
  message?: string;
}

// Acceso a datos para Administración > Dispositivos (RF-11 a RF-14).
// Alta/edición van directo contra dispositivos (RLS ya lo permite para
// admin). La credencial se emite via la RPC
// admin_rotar_credencial_dispositivo (D-003): el secreto se genera y se
// hashea del lado del servidor, y solo se devuelve en claro una vez, como
// resultado de esa llamada.
@Injectable({ providedIn: 'root' })
export class DevicesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listDevices(): Promise<Device[]> {
    const { data, error } = await this.supabaseService.client
      .from('dispositivos')
      .select('*, ubicaciones(nombre)')
      .order('codigo', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar la lista de dispositivos: ${error.message}`);
    }
    return (data ?? []) as Device[];
  }

  async listLocations(): Promise<LocationSummary[]> {
    const { data, error } = await this.supabaseService.client
      .from('ubicaciones')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar la lista de ubicaciones: ${error.message}`);
    }
    return (data ?? []) as LocationSummary[];
  }

  async createDevice(input: CreateDeviceInput): Promise<ServiceResult & { deviceId?: string }> {
    const { data, error } = await this.supabaseService.client
      .from('dispositivos')
      .insert({ codigo: input.codigo, nombre: input.nombre, ubicacion_id: input.ubicacion_id })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { ok: false, message: `Ya existe un dispositivo con el código "${input.codigo}".` };
      }
      return { ok: false, message: error.message };
    }
    return { ok: true, deviceId: (data as { id: string }).id };
  }

  async updateDevice(
    id: string,
    patch: Partial<Pick<Device, 'nombre' | 'ubicacion_id' | 'estado'>>,
  ): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.from('dispositivos').update(patch).eq('id', id);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }

  async setStatus(id: string, estado: DeviceStatus): Promise<ServiceResult> {
    return this.updateDevice(id, { estado });
  }

  async rotateCredential(deviceId: string): Promise<ServiceResult & { secret?: string }> {
    const { data, error } = await this.supabaseService.client.rpc('admin_rotar_credencial_dispositivo', {
      _id_dispositivo: deviceId,
    });

    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, secret: data as string };
  }
}
