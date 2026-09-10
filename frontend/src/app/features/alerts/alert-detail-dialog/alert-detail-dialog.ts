import { Component, Inject, OnInit, signal, type WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth.service';
import { AlertsService } from '../alerts.service';
import type { Alert, AlertHistoryEntry } from '../../../core/models/alert.model';

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Nueva',
  ACKNOWLEDGED: 'Reconocida',
  ATTENDED: 'Atendida',
  CLOSED: 'Cerrada',
};

// Detalle de una alerta: linea de tiempo completa y, si el rol lo
// permite (D-007: solo admin/analista), el boton para avanzar al
// siguiente estado. El dialogo se queda abierto tras cada accion para
// poder encadenar reconocer -> atender -> cerrar sin reabrir.
@Component({
  selector: 'wq-alert-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './alert-detail-dialog.html',
  styleUrl: './alert-detail-dialog.scss',
})
export class AlertDetailDialog implements OnInit {
  readonly statusLabel = STATUS_LABEL;
  readonly commentControl = new FormControl('', { nonNullable: true });

  readonly alert: WritableSignal<Alert>;
  readonly history = signal<AlertHistoryEntry[]>([]);
  readonly loadingHistory = signal(true);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly changed = signal(false);

  constructor(
    private readonly dialogRef: MatDialogRef<AlertDetailDialog, boolean>,
    private readonly alertsService: AlertsService,
    protected readonly authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public readonly data: { alert: Alert },
  ) {
    // Los inicializadores de campo corren antes que el cuerpo del
    // constructor, donde recien queda asignado "data" (propiedad de
    // parametro) -- por eso esta asignacion va aqui y no arriba.
    this.alert = signal<Alert>(this.data.alert);
  }

  ngOnInit(): void {
    void this.loadHistory();
  }

  get canAct(): boolean {
    const role = this.authService.role();
    return role === 'admin' || role === 'analyst';
  }

  async loadHistory(): Promise<void> {
    this.loadingHistory.set(true);
    try {
      this.history.set(await this.alertsService.getHistory(this.alert().id));
    } catch (err) {
      console.error(err);
    } finally {
      this.loadingHistory.set(false);
    }
  }

  async acknowledge(): Promise<void> {
    await this.runAction(() => this.alertsService.acknowledge(this.alert().id));
  }

  async attend(): Promise<void> {
    await this.runAction(() => this.alertsService.attend(this.alert().id, this.commentControl.value || null));
  }

  async close(): Promise<void> {
    await this.runAction(() => this.alertsService.close(this.alert().id, this.commentControl.value || null));
  }

  private async runAction(fn: () => Promise<{ ok: boolean; message?: string }>): Promise<void> {
    this.submitting.set(true);
    this.errorMessage.set(null);

    const result = await fn();

    if (!result.ok) {
      this.submitting.set(false);
      this.errorMessage.set(result.message ?? 'No se pudo completar la acción.');
      return;
    }

    this.commentControl.setValue('');
    this.changed.set(true);
    await this.loadHistory();

    // El estado real lo escribio la funcion RPC del lado del servidor; se
    // toma de la ultima entrada del historial recien recargado en vez de
    // adivinarlo del lado del cliente.
    const last = this.history().at(-1);
    if (last) {
      this.alert.update((a) => ({ ...a, status: last.to_status }));
    }

    this.submitting.set(false);
  }

  closeDialog(): void {
    this.dialogRef.close(this.changed());
  }
}
