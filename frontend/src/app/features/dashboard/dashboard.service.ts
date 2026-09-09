import { Injectable } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { SupabaseService } from '../../core/supabase.service';
import type { Parameter } from '../../core/models/parameter.model';
import type { LatestMeasurement, EvaluationResult } from '../../core/models/measurement.model';
import type { DashboardAlert } from '../../core/models/alert.model';

export interface DashboardDevice {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  last_seen_at: string | null;
}

interface MeasurementRow {
  value: number;
  evaluation_result: EvaluationResult | null;
  created_at: string;
  parameters: { code: string; name: string; unit: string } | null;
  measurement_batches: { measured_at: string; device_id: string } | null;
}

const RECENT_LIMIT = 30;

// Acceso a datos y suscripción en vivo para el Dashboard (RF-22 a RF-26).
@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listDevices(): Promise<DashboardDevice[]> {
    const { data, error } = await this.supabaseService.client
      .from('devices')
      .select('id, code, name, status, last_seen_at')
      .order('code', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar la lista de dispositivos: ${error.message}`);
    }
    return (data ?? []) as DashboardDevice[];
  }

  async getDevice(deviceId: string): Promise<DashboardDevice | null> {
    const { data, error } = await this.supabaseService.client
      .from('devices')
      .select('id, code, name, status, last_seen_at')
      .eq('id', deviceId)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo cargar el dispositivo: ${error.message}`);
    }
    return data as DashboardDevice | null;
  }

  async listParameters(): Promise<Parameter[]> {
    const { data, error } = await this.supabaseService.client
      .from('parameters')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar el catálogo de parámetros: ${error.message}`);
    }
    return (data ?? []) as Parameter[];
  }

  /** Últimas RECENT_LIMIT mediciones del dispositivo, mas recientes primero. */
  async getRecentMeasurements(deviceId: string): Promise<MeasurementRow[]> {
    const { data, error } = await this.supabaseService.client
      .from('measurements')
      .select('value, evaluation_result, created_at, parameters(code, name, unit), measurement_batches!inner(measured_at, device_id)')
      .eq('measurement_batches.device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT * 4); // hasta RECENT_LIMIT lotes, 4 parametros por lote

    if (error) {
      throw new Error(`No se pudo cargar las mediciones recientes: ${error.message}`);
    }
    return (data ?? []) as unknown as MeasurementRow[];
  }

  /** Combina el catalogo de parametros con la ultima lectura + tendencia de cada uno. */
  buildLatestMeasurements(parameters: Parameter[], rows: MeasurementRow[]): LatestMeasurement[] {
    return parameters.map((parameter) => {
      const rowsForParam = rows.filter((r) => r.parameters?.code === parameter.code);
      const latest = rowsForParam[0];
      return {
        parameter,
        value: latest?.value ?? null,
        evaluation_result: latest?.evaluation_result ?? null,
        measured_at: latest?.measurement_batches?.measured_at ?? null,
        trend: rowsForParam
          .slice(0, 12)
          .map((r) => r.value)
          .reverse(),
      };
    });
  }

  async getActiveAlerts(deviceId: string): Promise<DashboardAlert[]> {
    const { data, error } = await this.supabaseService.client
      .from('alerts')
      .select('id, severity, status, opened_at, parameters(name)')
      .eq('device_id', deviceId)
      .neq('status', 'CLOSED')
      .order('opened_at', { ascending: false });

    if (error) {
      throw new Error(`No se pudo cargar las alertas: ${error.message}`);
    }
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
      id: row['id'] as string,
      severity: row['severity'] as DashboardAlert['severity'],
      status: row['status'] as DashboardAlert['status'],
      opened_at: row['opened_at'] as string,
      parameter_name: (row['parameters'] as { name: string } | null)?.name ?? '—',
    }));
  }

  /** Se suscribe a lotes y alertas nuevas del dispositivo. Devuelve una funcion para cancelar. */
  subscribeToDevice(
    deviceId: string,
    onChange: () => void,
    onStatusChange: (status: 'SUBSCRIBED' | 'RECONNECTING' | 'ERROR') => void,
  ): () => void {
    const client = this.supabaseService.client;

    const channel: RealtimeChannel = client
      .channel(`dashboard-device-${deviceId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'measurement_batches', filter: `device_id=eq.${deviceId}` },
        () => onChange(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `device_id=eq.${deviceId}` },
        () => onChange(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onStatusChange('SUBSCRIBED');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatusChange('ERROR');
        else if (status === 'CLOSED') onStatusChange('RECONNECTING');
      });

    return () => {
      void client.removeChannel(channel);
    };
  }
}
