import { Injectable } from '@angular/core';

import { SupabaseService } from '../../core/supabase.service';
import type { Alert, AlertHistoryEntry, AlertSeverity, AlertStatus } from '../../core/models/alert.model';
import type { DashboardDevice } from '../dashboard/dashboard.service';
import type { Parameter } from '../../core/models/parameter.model';

export interface ServiceResult {
  ok: boolean;
  message?: string;
}

export interface AlertFilters {
  status: AlertStatus | 'ALL';
  severity: AlertSeverity | null;
  deviceId: string | null;
  parameterId: string | null;
  dateFrom: string | null; // ISO
  dateTo: string | null; // ISO
}

// Acceso a datos para Alertas (RF-30 a RF-34). Las transiciones de
// estado pasan exclusivamente por las funciones RPC
// reconocer_alerta/atender_alerta/cerrar_alerta (docs/API_CONTRACT.md): no
// hay UPDATE directo sobre la tabla desde el cliente, ni siquiera para
// admin/analista -- esa es la unica via, y ya valida el rol adentro
// (D-007: tecnico de campo no puede invocarlas).
@Injectable({ providedIn: 'root' })
export class AlertsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listAlerts(filters: AlertFilters): Promise<Alert[]> {
    let query = this.supabaseService.client
      .from('alertas')
      .select('*, dispositivos(codigo, nombre), parametros(nombre, unidad), mediciones!primera_medicion_id(valor)')
      .order('abierta_en', { ascending: false });

    if (filters.status !== 'ALL') query = query.eq('estado', filters.status);
    if (filters.severity) query = query.eq('gravedad', filters.severity);
    if (filters.deviceId) query = query.eq('dispositivo_id', filters.deviceId);
    if (filters.parameterId) query = query.eq('parametro_id', filters.parameterId);
    if (filters.dateFrom) query = query.gte('abierta_en', filters.dateFrom);
    if (filters.dateTo) query = query.lte('abierta_en', filters.dateTo);

    const { data, error } = await query;
    if (error) {
      throw new Error(`No se pudo cargar las alertas: ${error.message}`);
    }
    return (data ?? []) as unknown as Alert[];
  }

  async listDevices(): Promise<DashboardDevice[]> {
    const { data, error } = await this.supabaseService.client
      .from('dispositivos')
      .select('id, codigo, nombre, estado, ultima_comunicacion')
      .order('codigo', { ascending: true });
    if (error) throw new Error(`No se pudo cargar la lista de dispositivos: ${error.message}`);
    return (data ?? []) as DashboardDevice[];
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

  async getHistory(alertId: string): Promise<AlertHistoryEntry[]> {
    const { data, error } = await this.supabaseService.client
      .from('historial_alertas')
      .select('id, estado_origen, estado_destino, comentario, cambiado_en, perfiles(nombre_completo)')
      .eq('alerta_id', alertId)
      .order('cambiado_en', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar el historial de la alerta: ${error.message}`);
    }
    return (data ?? []) as unknown as AlertHistoryEntry[];
  }

  async acknowledge(alertId: string): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.rpc('reconocer_alerta', { _id_alerta: alertId });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  async attend(alertId: string, comment: string | null): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.rpc('atender_alerta', {
      _id_alerta: alertId,
      _comentario: comment,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  async close(alertId: string, comment: string | null): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.rpc('cerrar_alerta', {
      _id_alerta: alertId,
      _comentario: comment,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }
}
