import { Injectable } from '@angular/core';

import { SupabaseService } from '../../core/supabase.service';
import type { Calibration, MaintenanceEvent, MaintenanceRecord, MaintenanceType } from '../../core/models/maintenance.model';
import { MAINTENANCE_TYPE_LABELS } from '../../core/models/maintenance.model';
import type { Device } from '../../core/models/device.model';
import type { Parameter } from '../../core/models/parameter.model';

export interface ServiceResult {
  ok: boolean;
  message?: string;
}

export interface RegisterMaintenanceInput {
  dispositivo_id: string;
  kind: 'calibracion' | 'mantenimiento';
  parametro_id: string | null; // solo aplica a calibraciones
  notas: string | null;
  proxima_fecha: string | null;
}

// Acceso a datos para Calibraciones y mantenimiento. Las politicas RLS de
// `calibraciones`/`registros_mantenimiento` ya implementan exactamente lo
// que pide docs/ROLE_MATRIX.md: administrador y analista pueden consultar
// todo (analista de solo lectura, D-008), un tecnico de campo solo ve/crea
// sobre sus dispositivos asignados (D-007), y solo administrador/tecnico
// asignado pueden insertar -- este servicio no reimplementa esas reglas,
// solo las consulta; la interfaz oculta el boton "Registrar" cuando el rol
// no puede insertar, pero el rechazo real ocurre en el servidor si se
// intentara de todas formas.
@Injectable({ providedIn: 'root' })
export class MaintenanceService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listVisibleDevices(): Promise<Device[]> {
    const { data, error } = await this.supabaseService.client
      .from('dispositivos')
      .select('*, ubicaciones(nombre)')
      .order('codigo', { ascending: true });
    if (error) throw new Error(`No se pudo cargar la lista de dispositivos: ${error.message}`);
    return (data ?? []) as Device[];
  }

  async listParameters(): Promise<Parameter[]> {
    const { data, error } = await this.supabaseService.client
      .from('parametros')
      .select('*')
      .eq('is_active', true)
      .order('nombre', { ascending: true });
    if (error) throw new Error(`No se pudo cargar el catálogo de parámetros: ${error.message}`);
    return (data ?? []) as Parameter[];
  }

  async listEvents(deviceId: string | null): Promise<MaintenanceEvent[]> {
    let calibQuery = this.supabaseService.client
      .from('calibraciones')
      .select('*, dispositivos(codigo, nombre), parametros(nombre), perfiles!realizada_por(nombre_completo)')
      .order('realizada_en', { ascending: false });
    let maintQuery = this.supabaseService.client
      .from('registros_mantenimiento')
      .select('*, dispositivos(codigo, nombre), perfiles!realizado_por(nombre_completo)')
      .order('realizado_en', { ascending: false });

    if (deviceId) {
      calibQuery = calibQuery.eq('dispositivo_id', deviceId);
      maintQuery = maintQuery.eq('dispositivo_id', deviceId);
    }

    const [calibResult, maintResult] = await Promise.all([calibQuery, maintQuery]);

    if (calibResult.error) throw new Error(`No se pudo cargar las calibraciones: ${calibResult.error.message}`);
    if (maintResult.error) throw new Error(`No se pudo cargar el mantenimiento: ${maintResult.error.message}`);

    const calibrations = (calibResult.data ?? []) as unknown as Calibration[];
    const maintenance = (maintResult.data ?? []) as unknown as MaintenanceRecord[];

    const fromCalibrations: MaintenanceEvent[] = calibrations.map((c) => ({
      id: c.id,
      kind: 'calibracion',
      tipoLabel: 'Calibración',
      dispositivo: c.dispositivos ?? null,
      parametro: c.parametros?.nombre ?? null,
      fecha: c.realizada_en,
      responsable: c.perfiles?.nombre_completo ?? null,
      notas: c.notas,
      proximaFecha: c.proxima_fecha,
    }));

    const fromMaintenance: MaintenanceEvent[] = maintenance.map((m) => ({
      id: m.id,
      kind: 'mantenimiento',
      tipoLabel: MAINTENANCE_TYPE_LABELS[m.tipo as MaintenanceType] ?? m.tipo,
      dispositivo: m.dispositivos ?? null,
      parametro: null,
      fecha: m.realizado_en,
      responsable: m.perfiles?.nombre_completo ?? null,
      notas: m.notas,
      proximaFecha: m.proxima_fecha,
    }));

    return [...fromCalibrations, ...fromMaintenance].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }

  async register(input: RegisterMaintenanceInput): Promise<ServiceResult> {
    if (input.kind === 'calibracion') {
      const { error } = await this.supabaseService.client.from('calibraciones').insert({
        dispositivo_id: input.dispositivo_id,
        parametro_id: input.parametro_id,
        notas: input.notas,
        proxima_fecha: input.proxima_fecha,
      });
      if (error) return { ok: false, message: error.message };
      return { ok: true };
    }

    const { error } = await this.supabaseService.client.from('registros_mantenimiento').insert({
      dispositivo_id: input.dispositivo_id,
      tipo: 'MANTENIMIENTO' satisfies MaintenanceType,
      notas: input.notas,
      proxima_fecha: input.proxima_fecha,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }
}
