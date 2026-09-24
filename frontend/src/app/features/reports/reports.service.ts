import { Injectable } from '@angular/core';

import { SupabaseService } from '../../core/supabase.service';
import type { DashboardDevice } from '../dashboard/dashboard.service';
import type { EvaluationResult } from '../../core/models/measurement.model';
import type { Threshold } from '../../core/models/threshold.model';

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
  // Para la caratula (wq-gauge): rango fisico del parametro y el umbral
  // activo al momento de generar el reporte, mas un resultado "resumen"
  // del periodo (CRITICO si hubo al menos una lectura critica, ALERTA si
  // hubo al menos una en alerta, si no CONFORME) para que la pildora de
  // estado de la caratula tenga sentido sobre un periodo completo y no
  // sobre una sola lectura.
  minimoFisico: number | null;
  maximoFisico: number | null;
  umbral: Threshold | null;
  resultadoPeriodo: EvaluationResult | null;
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

/**
 * Que es: acceso a datos para Reportes (RF-37 a RF-39): estadisticas por
 * parametro (min/max/promedio/lecturas/alertas) para un dispositivo y un
 * periodo de fechas, exportables luego a PDF/Excel desde reports.ts.
 *
 * Como funciona: buildReport() hace 4 consultas en paralelo (mediciones
 * del periodo, conteo de alertas del periodo, catalogo de parametros y
 * umbrales activos) y reduce las mediciones del lado del cliente a un
 * ParameterStats por parametro -- no existe un RPC de agregacion en la
 * base de datos para esto, asi que se trae hasta MAX_ROWS filas y se
 * calcula aqui. Es suficiente para el volumen de datos de un proyecto
 * academico; si el periodo trae mas de MAX_ROWS mediciones, se avisa que
 * el reporte esta truncado en vez de fingir que es completo.
 *
 * Por que trae tambien parametros/umbrales: la caratula (wq-gauge) de
 * cada tarjeta de estadistica necesita el rango fisico y las bandas de
 * umbral reales para dibujarse, igual que en el Dashboard.
 */
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

    const [
      { data: measurementRows, error: measError, count },
      { count: alertCount, error: alertError },
      { data: parametrosRows, error: paramError },
      { data: umbralesRows, error: umbralError },
    ] = await Promise.all([
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
      // Rango fisico y umbral activo por parametro, solo para dibujar las
      // bandas de la caratula (wq-gauge) -- no afecta las estadisticas.
      client.from('parametros').select('id, codigo, minimo_fisico, maximo_fisico'),
      client.from('umbrales').select('*').eq('is_active', true),
    ]);

    if (measError) throw new Error(`No se pudo cargar las mediciones del periodo: ${measError.message}`);
    if (alertError) throw new Error(`No se pudo cargar las alertas del periodo: ${alertError.message}`);
    if (paramError) throw new Error(`No se pudo cargar el catálogo de parámetros: ${paramError.message}`);
    if (umbralError) throw new Error(`No se pudo cargar los umbrales: ${umbralError.message}`);

    const limitesPorCodigo = new Map((parametrosRows ?? []).map((p) => [p.codigo as string, p]));
    const umbralesPorParametroId = new Map(((umbralesRows ?? []) as Threshold[]).map((u) => [u.parametro_id, u]));

    const byParam = new Map<string, ParameterStats>();

    for (const row of (measurementRows ?? []) as unknown as Array<Record<string, any>>) {
      const p = row['parametros'] as { codigo: string; nombre: string; unidad: string } | null;
      if (!p) continue;
      const medidoEn = row['lotes_medicion']?.medido_en as string;
      const valor = row['valor'] as number;
      const evalResult = row['resultado_evaluacion'] as EvaluationResult | null;

      let stats = byParam.get(p.codigo);
      if (!stats) {
        const limites = limitesPorCodigo.get(p.codigo) as { minimo_fisico: number | null; maximo_fisico: number | null } | undefined;
        stats = {
          codigo: p.codigo,
          nombre: p.nombre,
          unidad: p.unidad,
          count: 0,
          min: null,
          max: null,
          avg: null,
          alertCount: 0,
          criticalCount: 0,
          trend: [],
          minimoFisico: limites?.minimo_fisico ?? null,
          maximoFisico: limites?.maximo_fisico ?? null,
          umbral: null,
          resultadoPeriodo: 'CONFORME',
        };
        byParam.set(p.codigo, stats);
      }

      stats.count += 1;
      stats.min = stats.min === null ? valor : Math.min(stats.min, valor);
      stats.max = stats.max === null ? valor : Math.max(stats.max, valor);
      stats.avg = stats.avg === null ? valor : stats.avg + valor; // suma provisional; se divide al final
      if (evalResult === 'ALERTA') {
        stats.alertCount += 1;
        if (stats.resultadoPeriodo !== 'CRITICO') stats.resultadoPeriodo = 'ALERTA';
      }
      if (evalResult === 'CRITICO') {
        stats.criticalCount += 1;
        stats.resultadoPeriodo = 'CRITICO';
      }
      stats.trend.push({ medido_en: medidoEn, valor });
    }

    const parameterStats = Array.from(byParam.values()).map((s) => {
      const idParametro = (limitesPorCodigo.get(s.codigo) as { id: string } | undefined)?.id ?? null;
      return {
        ...s,
        avg: s.avg !== null && s.count > 0 ? Math.round((s.avg / s.count) * 100) / 100 : null,
        umbral: idParametro ? (umbralesPorParametroId.get(idParametro) ?? null) : null,
      };
    });
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
