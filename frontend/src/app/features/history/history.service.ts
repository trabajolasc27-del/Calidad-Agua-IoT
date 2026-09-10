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
  value: number;
  evaluation_result: EvaluationResult | null;
  measured_at: string;
  parameter_code: string;
  parameter_name: string;
  parameter_unit: string;
  device_code: string;
  device_name: string;
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
      .from('devices')
      .select('id, code, name, status, last_seen_at')
      .order('code', { ascending: true });
    if (error) throw new Error(`No se pudo cargar los dispositivos: ${error.message}`);
    return (data ?? []) as DashboardDevice[];
  }

  async listLocations(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await this.supabaseService.client
      .from('locations')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) throw new Error(`No se pudo cargar las ubicaciones: ${error.message}`);
    return (data ?? []) as { id: string; name: string }[];
  }

  async listParameters(): Promise<Parameter[]> {
    const { data, error } = await this.supabaseService.client
      .from('parameters')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw new Error(`No se pudo cargar los parámetros: ${error.message}`);
    return (data ?? []) as Parameter[];
  }

  /** Dispositivos que pertenecen a una ubicacion, para poder filtrar por ubicacion sin depender de un filtro anidado en PostgREST. */
  private async deviceIdsForLocation(locationId: string): Promise<string[]> {
    const { data, error } = await this.supabaseService.client
      .from('devices')
      .select('id')
      .eq('location_id', locationId);
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
      .from('measurements')
      .select(
        'id, value, evaluation_result, parameters(code, name, unit), measurement_batches!inner(measured_at, device_id, devices(code, name))',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false });

    if (deviceIds !== null) {
      query = query.in('measurement_batches.device_id', deviceIds);
    }
    if (filters.parameterId) {
      query = query.eq('parameter_id', filters.parameterId);
    }
    if (filters.evaluationResult) {
      query = query.eq('evaluation_result', filters.evaluationResult);
    }
    if (filters.dateFrom) {
      query = query.gte('measurement_batches.measured_at', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte('measurement_batches.measured_at', filters.dateTo);
    }

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new Error(`No se pudo cargar el historial: ${error.message}`);
    }

    const rows = ((data ?? []) as unknown as Array<Record<string, any>>).map((r) => ({
      id: r['id'] as string,
      value: r['value'] as number,
      evaluation_result: r['evaluation_result'] as EvaluationResult | null,
      measured_at: r['measurement_batches']?.measured_at as string,
      parameter_code: r['parameters']?.code as string,
      parameter_name: r['parameters']?.name as string,
      parameter_unit: r['parameters']?.unit as string,
      device_code: r['measurement_batches']?.devices?.code as string,
      device_name: r['measurement_batches']?.devices?.name as string,
    }));

    return { rows, total: count ?? 0 };
  }

  readonly pageSize = PAGE_SIZE;

  /** Serie cronologica (mas antiguo -> mas reciente) para graficar tendencia. Solo tiene sentido con un parametro fijo (misma unidad). */
  async queryTrend(filters: HistoryFilters, limit = 100): Promise<{ measured_at: string; value: number }[]> {
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
      .from('measurements')
      .select('value, evaluation_result, measurement_batches!inner(measured_at, device_id)')
      .eq('parameter_id', filters.parameterId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (deviceIds !== null) query = query.in('measurement_batches.device_id', deviceIds);
    if (filters.evaluationResult) query = query.eq('evaluation_result', filters.evaluationResult);
    if (filters.dateFrom) query = query.gte('measurement_batches.measured_at', filters.dateFrom);
    if (filters.dateTo) query = query.lte('measurement_batches.measured_at', filters.dateTo);

    const { data, error } = await query;
    if (error) throw new Error(`No se pudo cargar la tendencia: ${error.message}`);

    return ((data ?? []) as unknown as Array<Record<string, any>>)
      .map((r) => ({ measured_at: r['measurement_batches']?.measured_at as string, value: r['value'] as number }))
      .reverse();
  }
}
