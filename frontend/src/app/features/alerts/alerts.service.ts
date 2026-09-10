import { Injectable } from '@angular/core';

import { SupabaseService } from '../../core/supabase.service';
import type { Alert, AlertHistoryEntry, AlertStatus } from '../../core/models/alert.model';

export interface ServiceResult {
  ok: boolean;
  message?: string;
}

// Acceso a datos para Alertas (RF-30 a RF-34). Las transiciones de
// estado pasan exclusivamente por las funciones RPC
// acknowledge_alert/attend_alert/close_alert (docs/API_CONTRACT.md): no
// hay UPDATE directo sobre la tabla desde el cliente, ni siquiera para
// admin/analista -- esa es la unica via, y ya valida el rol adentro
// (D-007: tecnico de campo no puede invocarlas).
@Injectable({ providedIn: 'root' })
export class AlertsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listAlerts(status: AlertStatus | 'ALL'): Promise<Alert[]> {
    let query = this.supabaseService.client
      .from('alerts')
      .select('*, devices(code, name), parameters(name, unit)')
      .order('opened_at', { ascending: false });

    if (status !== 'ALL') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`No se pudo cargar las alertas: ${error.message}`);
    }
    return (data ?? []) as unknown as Alert[];
  }

  async getHistory(alertId: string): Promise<AlertHistoryEntry[]> {
    const { data, error } = await this.supabaseService.client
      .from('alert_history')
      .select('id, from_status, to_status, comment, changed_at, profiles(full_name)')
      .eq('alert_id', alertId)
      .order('changed_at', { ascending: true });

    if (error) {
      throw new Error(`No se pudo cargar el historial de la alerta: ${error.message}`);
    }
    return (data ?? []) as unknown as AlertHistoryEntry[];
  }

  async acknowledge(alertId: string): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.rpc('acknowledge_alert', { _alert_id: alertId });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  async attend(alertId: string, comment: string | null): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.rpc('attend_alert', {
      _alert_id: alertId,
      _comment: comment,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  async close(alertId: string, comment: string | null): Promise<ServiceResult> {
    const { error } = await this.supabaseService.client.rpc('close_alert', {
      _alert_id: alertId,
      _comment: comment,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }
}
