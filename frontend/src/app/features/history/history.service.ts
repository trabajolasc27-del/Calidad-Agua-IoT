import { Injectable } from '@angular/core';

import { SupabaseService } from '../../core/supabase.service';
import type { DashboardDevice } from '../dashboard/dashboard.service';
import type { Parameter } from '../../core/models/parameter.model';
import type { EvaluationResult } from '../../core/models/measurement.model';

export interface HistoryFilters {
  deviceId: string | null;
  locationId: string | null;
  parameterId: string | null;
  evaluationResult: EvaluationResult | null;
  dateFrom: string | null; // ISO
  dateTo: string | null; // ISO
}

export interface HistoryRow {
  id: string;
  valor: number;
  resultado_evaluacion: EvaluationResult | null;
  medido_en: string;
  codigo_parametro: string;
  nombre_parametro: string;
  unidad_parametro: string;
  codigo_dispositivo: string;
  nombre_dispositivo: string;
}

export interface HistoryPage {
  rows: HistoryRow[];
  total: number;
}

const PAGE_SIZE = 20;

// Acceso a datos para Historial (RF-27 a RF-29).
@Injectable({ providedIn: 'root' })
export class HistoryService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listDevices(): Promise<DashboardDevice[]> {
    const { data, error } = await this.supabaseService.client
      .from('dispositivos')
      .select('id, codigo, nombre, estado, ultima_comunicacion')
      .order('codigo', { ascending: true });
    if (error) throw new Error(`No se pudo cargar los dispositivos: ${error.message}`);
    return (data ?? []) as DashboardDevice[];
  }

  async listLocations(): Promise<{ id: string; nombre: string }[]> {
    const { data, error } = await this.supabaseService.client
      .from('ubicaciones')
      .select('id, nombre')
      .order('nombre', { ascending: true });
    if (error) throw new Error(`No se pudo cargar las ubicaciones: ${error.message}`);
    return (data ?? []) as { id: string; nombre: string }[];
  }

  async listParameters(): Promise<Parameter[]> {
    const { data, error } = await this.supabaseService.client
      .from('parametros')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw new Error(`No se pudo cargar los parámetros: ${error.message}`);
    return (data ?? []) as Parameter[];
  }

  /** Dispositivos que pertenecen a una ubicacion, para poder filtrar por ubicacion sin depender de un filtro anidado en PostgREST. */
  private async deviceIdsForLocation(locationId: string): Promise<string[]> {
    const { data, error } = await this.supabaseService.client
      .from('dispositivos')
      .select('id')
      .eq('ubicacion_id', locationId);
    if (error) throw new Error(`No se pudo resolver los dispositivos de la ubicación: ${error.message}`);
    return (data ?? []).map((d) => d.id as string);
  }

  async queryPage(filters: HistoryFilters, pageIndex: number): Promise<HistoryPage> {
    let deviceIds: string[] | null = null;
    if (filters.locationId) {
      deviceIds = await this.deviceIdsForLocation(filters.locationId);
      if (filters.deviceId) {
        deviceIds = deviceIds.includes(filters.deviceId) ? [filters.deviceId] : [];
      }
    } else if (filters.deviceId) {
      deviceIds = [filters.deviceId];
    }

    // Sin dispositivos que cumplan el filtro de ubicacion: no hay nada que consultar.
    if (deviceIds !== null && deviceIds.length === 0) {
      return { rows: [], total: 0 };
    }

    let query = this.supabaseService.client
      .from('mediciones')
      .select(
        'id, valor, resultado_evaluacion, parametros(codigo, nombre, unidad), lotes_medicion!inner(medido_en, dispositivo_id, dispositivos(codigo, nombre))',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false });

    if (deviceIds !== null) {
      query = query.in('lotes_medicion.dispositivo_id', deviceIds);
    }
    if (filters.parameterId) {
      query = query.eq('parametro_id', filters.parameterId);
    }
    if (filters.evaluationResult) {
      query = query.eq('resultado_evaluacion', filters.evaluationResult);
    }
    if (filters.dateFrom) {
      query = query.gte('lotes_medicion.medido_en', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('lotes_medicion.medido_en', filters.dateTo);
    }

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new Error(`No se pudo cargar el historial: ${error.message}`);
    }

    const rows = ((data ?? []) as unknown as Array<Record<string, any>>).map((r) => ({
      id: r['id'] as string,
      valor: r['valor'] as number,
      resultado_evaluacion: r['resultado_evaluacion'] as EvaluationResult | null,
      medido_en: r['lotes_medicion']?.medido_en as string,
      codigo_parametro: r['parametros']?.codigo as string,
      nombre_parametro: r['parametros']?.nombre as string,
      unidad_parametro: r['parametros']?.unidad as string,
      codigo_dispositivo: r['lotes_medicion']?.dispositivos?.codigo as string,
      nombre_dispositivo: r['lotes_medicion']?.dispositivos?.nombre as string,
    }));

    return { rows, total: count ?? 0 };
  }

  readonly pageSize = PAGE_SIZE;

  /** Serie cronologica (mas antiguo -> mas reciente) para graficar tendencia. Solo tiene sentido con un parametro fijo (misma unidad). */
  async queryTrend(filters: HistoryFilters, limit = 100): Promise<{ medido_en: string; valor: number }[]> {
    if (!filters.parameterId) return [];

    let deviceIds: string[] | null = null;
    if (filters.locationId) {
      deviceIds = await this.deviceIdsForLocation(filters.locationId);
      if (filters.deviceId) {
        deviceIds = deviceIds.includes(filters.deviceId) ? [filters.deviceId] : [];
      }
    } else if (filters.deviceId) {
      deviceIds = [filters.deviceId];
    }
    if (deviceIds !== null && deviceIds.length === 0) return [];

    let query = this.supabaseService.client
      .from('mediciones')
      .select('valor, resultado_evaluacion, lotes_medicion!inner(medido_en, dispositivo_id)')
      .eq('parametro_id', filters.parameterId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (deviceIds !== null) query = query.in('lotes_medicion.dispositivo_id', deviceIds);
    if (filters.evaluationResult) query = query.eq('resultado_evaluacion', filters.evaluationResult);
    if (filters.dateFrom) query = query.gte('lotes_medicion.medido_en', filters.dateFrom);
    if (filters.dateTo) query = query.lte('lotes_medicion.medido_en', filters.dateTo);

    const { data, error } = await query;
    if (error) throw new Error(`No se pudo cargar la tendencia: ${error.message}`);

    return ((data ?? []) as unknown as Array<Record<string, any>>)
      .map((r) => ({ medido_en: r['lotes_medicion']?.medido_en as string, valor: r['valor'] as number }))
      .reverse();
  }
}
