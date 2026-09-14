import { Injectable } from '@angular/core';

import { SupabaseService } from '../../core/supabase.service';
import type { DashboardDevice } from '../dashboard/dashboard.service';
import type { EvaluationResult } from '../../core/models/measurement.model';

export interface ParameterStats {
  codigo: string;
  nombre: string;
  unidad: string;
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  alertCount: number;
  criticalCount: number;
  trend: { medido_en: string; valor: number }[];
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
      .from('dispositivos')
      .select('id, codigo, nombre, estado, ultima_comunicacion')
      .order('codigo', { ascending: true });
    if (error) throw new Error(`No se pudo cargar los dispositivos: ${error.message}`);
    return (data ?? []) as DashboardDevice[];
  }

  async buildReport(device: DashboardDevice, dateFromIso: string, dateToIso: string): Promise<{ report: ReportData; truncated: boolean }> {
    const client = this.supabaseService.client;

    const [{ data: measurementRows, error: measError, count }, { count: alertCount, error: alertError }] = await Promise.all([
      client
        .from('mediciones')
        .select('valor, resultado_evaluacion, lotes_medicion!inner(medido_en, dispositivo_id), parametros(codigo, nombre, unidad)', {
          count: 'exact',
        })
        .eq('lotes_medicion.dispositivo_id', device.id)
        .gte('lotes_medicion.medido_en', dateFromIso)
        .lte('lotes_medicion.medido_en', dateToIso)
        .order('medido_en', { ascending: true, referencedTable: 'lotes_medicion' })
        .limit(MAX_ROWS),
      client
        .from('alertas')
        .select('id', { count: 'exact', head: true })
        .eq('dispositivo_id', device.id)
        .gte('abierta_en', dateFromIso)
        .lte('abierta_en', dateToIso),
    ]);

    if (measError) throw new Error(`No se pudo cargar las mediciones del periodo: ${measError.message}`);
    if (alertError) throw new Error(`No se pudo cargar las alertas del periodo: ${alertError.message}`);

    const byParam = new Map<string, ParameterStats>();

    for (const row of (measurementRows ?? []) as unknown as Array<Record<string, any>>) {
      const p = row['parametros'] as { codigo: string; nombre: string; unidad: string } | null;
      if (!p) continue;
      const medidoEn = row['lotes_medicion']?.medido_en as string;
      const valor = row['valor'] as number;
      const evalResult = row['resultado_evaluacion'] as EvaluationResult | null;

      let stats = byParam.get(p.codigo);
      if (!stats) {
        stats = { codigo: p.codigo, nombre: p.nombre, unidad: p.unidad, count: 0, min: null, max: null, avg: null, alertCount: 0, criticalCount: 0, trend: [] };
        byParam.set(p.codigo, stats);
      }

      stats.count += 1;
      stats.min = stats.min === null ? valor : Math.min(stats.min, valor);
      stats.max = stats.max === null ? valor : Math.max(stats.max, valor);
      stats.avg = stats.avg === null ? valor : stats.avg + valor; // suma provisional; se divide al final
      if (evalResult === 'ALERTA') stats.alertCount += 1;
      if (evalResult === 'CRITICO') stats.criticalCount += 1;
      stats.trend.push({ medido_en: medidoEn, valor });
    }

    const parameterStats = Array.from(byParam.values()).map((s) => ({
      ...s,
      avg: s.avg !== null && s.count > 0 ? Math.round((s.avg / s.count) * 100) / 100 : null,
    }));
    parameterStats.sort((a, b) => a.nombre.localeCompare(b.nombre));

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
