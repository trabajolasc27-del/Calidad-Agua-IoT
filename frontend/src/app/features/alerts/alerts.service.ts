import { Injectable } from '@angular/core';

import { SupabaseService } from '../../core/supabase.service';
import type { Alert, AlertHistoryEntry, AlertStatus } from '../../core/models/alert.model';

export interface ServiceResult {
  ok: boolean;
  message?: string;
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

  async listAlerts(status: AlertStatus | 'ALL'): Promise<Alert[]> {
    let query = this.supabaseService.client
      .from('alertas')
      .select('*, dispositivos(codigo, nombre), parametros(nombre, unidad), mediciones!primera_medicion_id(valor)')
      .order('abierta_en', { ascending: false });

    if (status !== 'ALL') {
      query = query.eq('estado', status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`No se pudo cargar las alertas: ${error.message}`);
    }
    return (data ?? []) as unknown as Alert[];
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
