import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DevicesService } from '../admin/devices/devices.service';
import type { Device } from '../../core/models/device.model';
import { PageHeader } from '../../shared/page-header/page-header';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { deviceStatusMeta } from '../../shared/status.util';

type ViewState = 'loading' | 'data' | 'empty' | 'error';

// Consulta de dispositivos para cualquier rol autenticado (RF-11 a RF-14
// vistos en modo lectura). No existía ninguna pantalla que dejara ver
// dispositivos fuera de Administración > Dispositivos (exclusiva de
// administrador) -- las políticas RLS de `dispositivos` ya permiten que un
// analista vea todos y que un técnico de campo vea solo los suyos
// asignados (`es_dispositivo_asignado`), así que esta pantalla solo les da
// un lugar donde consultarlo. Las acciones de alta/edición/credencial
// siguen exclusivas de Administración.
@Component({
  selector: 'wq-devices-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PageHeader,
    EmptyState,
    StatusBadge,
  ],
  templateUrl: './devices-list.html',
  styleUrl: './devices-list.scss',
})
export class DevicesList implements OnInit {
  readonly search = new FormControl('', { nonNullable: true });

  readonly state = signal<ViewState>('loading');
  readonly errorMessage = signal<string | null>(null);
  readonly devices = signal<Device[]>([]);

  readonly filtered = computed(() => {
    const term = this.search.value.trim().toLowerCase();
    const list = this.devices();
    if (!term) return list;
    return list.filter(
      (d) => d.codigo.toLowerCase().includes(term) || d.nombre.toLowerCase().includes(term) || (d.ubicaciones?.nombre ?? '').toLowerCase().includes(term),
    );
  });

  readonly deviceStatusMeta = deviceStatusMeta;

  constructor(private readonly devicesService: DevicesService) {}

  ngOnInit(): void {
    void this.load();
    this.search.valueChanges.subscribe(() => this.updateEmptyState());
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const devices = await this.devicesService.listDevices();
      this.devices.set(devices);
      this.updateEmptyState();
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al cargar los dispositivos.');
      this.state.set('error');
    }
  }

  private updateEmptyState(): void {
    if (this.state() === 'error') return;
    this.state.set(this.filtered().length === 0 ? 'empty' : 'data');
  }
}
