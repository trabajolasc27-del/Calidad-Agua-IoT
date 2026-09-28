import { Injectable, computed, signal } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';

/**
 * Contador de alertas activas para la campana de notificaciones del
 * encabezado (AppShell). Se apoya en las mismas políticas RLS que ya
 * limitan qué alertas ve cada rol (administrador/analista ven todas, un
 * técnico solo las de sus dispositivos asignados, ver D-007) -- este
 * servicio no filtra nada por su cuenta, solo cuenta filas.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly countSignal = signal(0);
  readonly count = this.countSignal.asReadonly();
  readonly hasActive = computed(() => this.countSignal() > 0);

  private channel: RealtimeChannel | null = null;

  constructor(private readonly supabaseService: SupabaseService) {}

  async refresh(): Promise<void> {
    const { count, error } = await this.supabaseService.client
      .from('alertas')
      .select('id', { count: 'exact', head: true })
      .neq('estado', 'CERRADA');

    if (!error) {
      this.countSignal.set(count ?? 0);
    }
  }

  /** Se suscribe una sola vez (llamado desde AppShell) para refrescar el contador cuando cambia cualquier alerta visible. */
  startWatching(): void {
    if (this.channel) return;
    void this.refresh();
    this.channel = this.supabaseService.client
      .channel('notificaciones-alertas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, () => void this.refresh())
      .subscribe();
  }

  stopWatching(): void {
    if (this.channel) {
      void this.supabaseService.client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
