import { Injectable } from '@angular/core';

import { SupabaseService } from '../../../core/supabase.service';
import type { Parameter } from '../../../core/models/parameter.model';
import type { Threshold } from '../../../core/models/threshold.model';

export interface ThresholdInput {
  parameter_id: string;
  critical_low: number | null;
  warning_low: number | null;
  warning_high: number | null;
  critical_high: number | null;
  consecutive_breaches_to_alert: number;
}

export interface ServiceResult {
  ok: boolean;
  message?: string;
}

export interface ParameterWithThresholds {
  parameter: Parameter;
  active: Threshold | null;
  history: Threshold[]; // versiones anteriores, mas reciente primero
}

// Acceso a datos para Administración > Umbrales (RF-16/RF-17). Crear una
// versión nueva pasa por la RPC admin_create_threshold_version: desactiva
// la anterior e inserta la nueva en una sola transacción (ver migración
// 20260901121700_threshold_version_rpc.sql).
@Injectable({ providedIn: 'root' })
export class ThresholdsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listByParameter(): Promise<ParameterWithThresholds[]> {
    const client = this.supabaseService.client;

    const [{ data: parameters, error: paramError }, { data: thresholds, error: threshError }] = await Promise.all([
      client.from('parameters').select('*').order('name', { ascending: true }),
      client.from('thresholds').select('*').order('version', { ascending: false }),
    ]);

    if (paramError) {
      throw new Error(`No se pudo cargar el catálogo de parámetros: ${paramError.message}`);
    }
    if (threshError) {
      throw new Error(`No se pudo cargar los umbrales: ${threshError.message}`);
    }

    return ((parameters ?? []) as Parameter[]).map((parameter) => {
      const rows = ((thresholds ?? []) as Threshold[]).filter((t) => t.parameter_id === parameter.id);
      const active = rows.find((t) => t.is_active) ?? null;
      const history = rows.filter((t) => !t.is_active);
      return { parameter, active, history };
    });
  }

  async createVersion(input: ThresholdInput): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.rpc('admin_create_threshold_version', {
      _parameter_id: input.parameter_id,
      _critical_low: input.critical_low,
      _warning_low: input.warning_low,
      _warning_high: input.warning_high,
      _critical_high: input.critical_high,
      _consecutive_breaches_to_alert: input.consecutive_breaches_to_alert,
    });

    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true };
  }
}
