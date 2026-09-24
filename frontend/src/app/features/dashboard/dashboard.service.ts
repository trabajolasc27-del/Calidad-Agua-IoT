import { Injectable } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { SupabaseService } from '../../core/supabase.service';
import type { Parameter } from '../../core/models/parameter.model';
import type { Threshold } from '../../core/models/threshold.model';
import type { LatestMeasurement, EvaluationResult } from '../../core/models/measurement.model';
import type { DashboardAlert } from '../../core/models/alert.model';

export interface DashboardDevice {
  id: string;
  codigo: string;
  nombre: string;
  estado: 'activo' | 'inactivo';
  ultima_comunicacion: string | null;
}

interface MeasurementRow {
  valor: number;
  resultado_evaluacion: EvaluationResult | null;
  created_at: string;
  parametros: { codigo: string; nombre: string; unidad: string } | null;
  lotes_medicion: { medido_en: string; dispositivo_id: string } | null;
}

const RECENT_LIMIT = 30;

// Acceso a datos y suscripción en vivo para el Dashboard (RF-22 a RF-26).
@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listDevices(): Promise<DashboardDevice[]> {
    const { data, error } = await this.supabaseService.client
      .from('dispositivos')
      .select('id, codigo, nombre, estado, ultima_comunicacion')
      .order('codigo', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar la lista de dispositivos: ${error.message}`);
    }
    return (data ?? []) as DashboardDevice[];
  }

  async getDevice(deviceId: string): Promise<DashboardDevice | null> {
    const { data, error } = await this.supabaseService.client
      .from('dispositivos')
      .select('id, codigo, nombre, estado, ultima_comunicacion')
      .eq('id', deviceId)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo cargar el dispositivo: ${error.message}`);
    }
    return data as DashboardDevice | null;
  }

  async listParameters(): Promise<Parameter[]> {
    const { data, error } = await this.supabaseService.client
      .from('parametros')
      .select('*')
      .eq('is_active', true)
      .order('nombre', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar el catálogo de parámetros: ${error.message}`);
    }
    return (data ?? []) as Parameter[];
  }

  /** Últimas RECENT_LIMIT mediciones del dispositivo, mas recientes primero. */
  async getRecentMeasurements(deviceId: string): Promise<MeasurementRow[]> {
    const { data, error } = await this.supabaseService.client
      .from('mediciones')
      .select('valor, resultado_evaluacion, created_at, parametros(codigo, nombre, unidad), lotes_medicion!inner(medido_en, dispositivo_id)')
      .eq('lotes_medicion.dispositivo_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT * 4); // hasta RECENT_LIMIT lotes, 4 parametros por lote

    if (error) {
      throw new Error(`No se pudo cargar las mediciones recientes: ${error.message}`);
    }
    return (data ?? []) as unknown as MeasurementRow[];
  }

  /**
   * Umbrales activos de todos los parámetros (uno por parámetro, el que
   * tenga is_active = true). Se usan solo para dibujar las bandas de la
   * carátula (wq-gauge) en el Dashboard -- la evaluación real de cada
   * lectura ya viene resuelta desde la base de datos, esto es puramente
   * visual.
   */
  async listActiveThresholds(): Promise<Threshold[]> {
    const { data, error } = await this.supabaseService.client
      .from('umbrales')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`No se pudo cargar los umbrales: ${error.message}`);
    }
    return (data ?? []) as Threshold[];
  }

  /** Combina el catalogo de parametros con la ultima lectura + tendencia + umbral activo de cada uno. */
  buildLatestMeasurements(parameters: Parameter[], rows: MeasurementRow[], thresholds: Threshold[]): LatestMeasurement[] {
    return parameters.map((parameter) => {
      const rowsForParam = rows.filter((r) => r.parametros?.codigo === parameter.codigo);
      const latest = rowsForParam[0];
      return {
        parameter,
        value: latest?.valor ?? null,
        evaluation_result: latest?.resultado_evaluacion ?? null,
        measured_at: latest?.lotes_medicion?.medido_en ?? null,
        trend: rowsForParam
          .slice(0, 12)
          .map((r) => r.valor)
          .reverse(),
        threshold: thresholds.find((t) => t.parametro_id === parameter.id) ?? null,
      };
    });
  }

  async getActiveAlerts(deviceId: string): Promise<DashboardAlert[]> {
    const { data, error } = await this.supabaseService.client
      .from('alertas')
      .select('id, gravedad, estado, abierta_en, parametros(nombre, unidad), mediciones!primera_medicion_id(valor)')
      .eq('dispositivo_id', deviceId)
      .neq('estado', 'CERRADA')
      .order('abierta_en', { ascending: false });

    if (error) {
      throw new Error(`No se pudo cargar las alertas: ${error.message}`);
    }
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
      id: row['id'] as string,
      gravedad: row['gravedad'] as DashboardAlert['gravedad'],
      estado: row['estado'] as DashboardAlert['estado'],
      abierta_en: row['abierta_en'] as string,
      nombre_parametro: (row['parametros'] as { nombre: string } | null)?.nombre ?? '—',
      unidad: (row['parametros'] as { unidad: string } | null)?.unidad ?? null,
      valor: (row['mediciones'] as { valor: number } | null)?.valor ?? null,
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
        { event: 'INSERT', schema: 'public', table: 'lotes_medicion', filter: `dispositivo_id=eq.${deviceId}` },
        () => onChange(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alertas', filter: `dispositivo_id=eq.${deviceId}` },
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
