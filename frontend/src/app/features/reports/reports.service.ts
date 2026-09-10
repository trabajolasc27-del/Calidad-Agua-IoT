import { Injectable } from '@angular/core';

import { SupabaseService } from '../../core/supabase.service';
import type { DashboardDevice } from '../dashboard/dashboard.service';
import type { EvaluationResult } from '../../core/models/measurement.model';

export interface ParameterStats {
  code: string;
  name: string;
  unit: string;
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  alertCount: number;
  criticalCount: number;
  trend: { measured_at: string; value: number }[];
}

export interface ReportData {
  device: DashboardDevice;
  dateFrom: string;
  dateTo: string;
  totalMeasurements: number;
  alertsOpened: number;
  parameterStats: ParameterStats[];
}

const MAX_ROWS = 2000;

// Acceso a datos para Reportes (RF-37 a RF-39). Las estadisticas
// (min/max/promedio) se calculan del lado del cliente sobre el periodo
// filtrado -- suficiente para el volumen de datos de este proyecto
// academico; si el periodo trae mas de MAX_ROWS mediciones, se avisa que
// el reporte esta truncado en vez de fingir que es completo.
@Injectable({ providedIn: 'root' })
export class ReportsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listDevices(): Promise<DashboardDevice[]> {
    const { data, error } = await this.supabaseService.client
      .from('devices')
      .select('id, code, name, status, last_seen_at')
      .order('code', { ascending: true });
    if (error) throw new Error(`No se pudo cargar los dispositivos: ${error.message}`);
    return (data ?? []) as DashboardDevice[];
  }

  async buildReport(device: DashboardDevice, dateFromIso: string, dateToIso: string): Promise<{ report: ReportData; truncated: boolean }> {
    const client = this.supabaseService.client;

    const [{ data: measurementRows, error: measError, count }, { count: alertCount, error: alertError }] = await Promise.all([
      client
        .from('measurements')
        .select('value, evaluation_result, measurement_batches!inner(measured_at, device_id), parameters(code, name, unit)', {
          count: 'exact',
        })
        .eq('measurement_batches.device_id', device.id)
        .gte('measurement_batches.measured_at', dateFromIso)
        .lte('measurement_batches.measured_at', dateToIso)
        .order('measured_at', { ascending: true, referencedTable: 'measurement_batches' })
        .limit(MAX_ROWS),
      client
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('device_id', device.id)
        .gte('opened_at', dateFromIso)
        .lte('opened_at', dateToIso),
    ]);

    if (measError) throw new Error(`No se pudo cargar las mediciones del periodo: ${measError.message}`);
    if (alertError) throw new Error(`No se pudo cargar las alertas del periodo: ${alertError.message}`);

    const byParam = new Map<string, ParameterStats>();

    for (const row of (measurementRows ?? []) as unknown as Array<Record<string, any>>) {
      const p = row['parameters'] as { code: string; name: string; unit: string } | null;
      if (!p) continue;
      const measuredAt = row['measurement_batches']?.measured_at as string;
      const value = row['value'] as number;
      const evalResult = row['evaluation_result'] as EvaluationResult | null;

      let stats = byParam.get(p.code);
      if (!stats) {
        stats = { code: p.code, name: p.name, unit: p.unit, count: 0, min: null, max: null, avg: null, alertCount: 0, criticalCount: 0, trend: [] };
        byParam.set(p.code, stats);
      }

      stats.count += 1;
      stats.min = stats.min === null ? value : Math.min(stats.min, value);
      stats.max = stats.max === null ? value : Math.max(stats.max, value);
      stats.avg = stats.avg === null ? value : stats.avg + value; // suma provisional; se divide al final
      if (evalResult === 'ALERTA') stats.alertCount += 1;
      if (evalResult === 'CRITICO') stats.criticalCount += 1;
      stats.trend.push({ measured_at: measuredAt, value });
    }

    const parameterStats = Array.from(byParam.values()).map((s) => ({
      ...s,
      avg: s.avg !== null && s.count > 0 ? Math.round((s.avg / s.count) * 100) / 100 : null,
    }));
    parameterStats.sort((a, b) => a.name.localeCompare(b.name));

    const report: ReportData = {
      device,
      dateFrom: dateFromIso,
      dateTo: dateToIso,
      totalMeasurements: measurementRows?.length ?? 0,
      alertsOpened: alertCount ?? 0,
      parameterStats,
    };

    return { report, truncated: (count ?? 0) > MAX_ROWS };
  }
}
