import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DevicesService } from './devices.service';
import type { Device } from '../../../core/models/device.model';
import { DeviceFormDialog, type DeviceFormDialogData } from './device-form-dialog/device-form-dialog';
import { DeviceCredentialDialog } from './device-credential-dialog/device-credential-dialog';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { deviceStatusMeta } from '../../../shared/status.util';
import { ConfirmService } from '../../../shared/confirm-dialog/confirm.service';

type ViewState = 'loading' | 'data' | 'empty' | 'error';

// Administración > Dispositivos (RF-11 a RF-14).
@Component({
  selector: 'wq-devices',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule,
    EmptyState,
    StatusBadge,
  ],
  templateUrl: './devices.html',
  styleUrl: './devices.scss',
})
export class Devices implements OnInit {
  readonly displayedColumns = ['code', 'name', 'location', 'last_seen_at', 'status', 'actions'];

  readonly state = signal<ViewState>('loading');
  readonly devices = signal<Device[]>([]);
  readonly errorMessage = signal<string | null>(null);

  readonly deviceStatusMeta = deviceStatusMeta;

  constructor(
    private readonly devicesService: DevicesService,
    private readonly dialog: MatDialog,
    private readonly confirmService: ConfirmService,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const devices = await this.devicesService.listDevices();
      this.devices.set(devices);
      this.state.set(devices.length === 0 ? 'empty' : 'data');
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al cargar los dispositivos.');
      this.state.set('error');
    }
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(DeviceFormDialog, { data: { mode: 'create' } as DeviceFormDialogData, width: '480px' });
    ref.afterClosed().subscribe(async (result) => {
      if (!result?.changed) return;
      await this.load();
      if (result.newDeviceId) {
        await this.issueCredential(result.newDeviceId, this.findCode(result.newDeviceId));
      }
    });
  }

  openEditDialog(device: Device): void {
    const ref = this.dialog.open(DeviceFormDialog, {
      data: { mode: 'edit', device } as DeviceFormDialogData,
      width: '480px',
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.changed) void this.load();
    });
  }

  async toggleStatus(device: Device): Promise<void> {
    const activating = device.estado !== 'activo';
    const confirmed = await this.confirmService.ask({
      title: activating ? 'Activar dispositivo' : 'Desactivar dispositivo',
      message: activating
        ? `"${device.codigo}" volverá a aparecer como activo y podrá enviar mediciones.`
        : `"${device.codigo}" dejará de aceptar mediciones hasta que se reactive.`,
      confirmLabel: activating ? 'Activar' : 'Desactivar',
      tone: activating ? 'default' : 'danger',
    });
    if (!confirmed) return;

    const next = activating ? 'activo' : 'inactivo';
    const result = await this.devicesService.setStatus(device.id, next);
    if (result.ok) {
      void this.load();
    } else {
      this.errorMessage.set(result.message ?? 'No se pudo cambiar el estado.');
    }
  }

  async rotateCredential(device: Device): Promise<void> {
    const confirmed = await this.confirmService.ask({
      title: 'Emitir nueva credencial',
      message: `Se invalidará la credencial actual de "${device.codigo}" de inmediato. El dispositivo físico necesitará la credencial nueva para volver a enviar datos.`,
      confirmLabel: 'Emitir nueva credencial',
      tone: 'danger',
    });
    if (!confirmed) return;

    await this.issueCredential(device.id, device.codigo);
  }

  private async issueCredential(deviceId: string, deviceCode: string): Promise<void> {
    const result = await this.devicesService.rotateCredential(deviceId);
    if (!result.ok || !result.secret) {
      this.errorMessage.set(result.message ?? 'No se pudo emitir la credencial.');
      return;
    }
    this.dialog.open(DeviceCredentialDialog, {
      data: { deviceCode, secret: result.secret },
      width: '460px',
      disableClose: true,
    });
  }

  private findCode(deviceId: string): string {
    return this.devices().find((d) => d.id === deviceId)?.codigo ?? deviceId;
  }
}
