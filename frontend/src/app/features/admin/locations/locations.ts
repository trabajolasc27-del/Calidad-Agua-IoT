import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import * as L from 'leaflet';

import { LocationsService } from './locations.service';
import { fixLeafletDefaultIcon } from '../../../core/leaflet-icon-fix';
import type { Location } from '../../../core/models/location.model';
import { LocationFormDialog, type LocationFormDialogData } from './location-form-dialog/location-form-dialog';

type ViewState = 'loading' | 'data' | 'empty' | 'error';

// Administración > Ubicaciones (RF-09). El mapa general de solo lectura
// para todos los roles (RF-10) llega con el Dashboard en la Fase 3; esta
// es la pantalla de administración con CRUD completo.
@Component({
  selector: 'wq-locations',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule],
  templateUrl: './locations.html',
  styleUrl: './locations.scss',
})
export class Locations implements AfterViewInit, OnDestroy {
  @ViewChild('overviewMap') private readonly mapElement!: ElementRef<HTMLDivElement>;

  readonly displayedColumns = ['name', 'coords', 'devices', 'actions'];

  readonly state = signal<ViewState>('loading');
  readonly locations = signal<Location[]>([]);
  readonly errorMessage = signal<string | null>(null);

  private map?: L.Map;
  private markers: L.Marker[] = [];

  constructor(
    private readonly locationsService: LocationsService,
    private readonly dialog: MatDialog,
  ) {}

  ngAfterViewInit(): void {
    fixLeafletDefaultIcon();
    this.map = L.map(this.mapElement.nativeElement).setView([17.9869, -92.9303], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    setTimeout(() => this.map?.invalidateSize(), 150);
    void this.load();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const locations = await this.locationsService.listLocations();
      this.locations.set(locations);
      this.state.set(locations.length === 0 ? 'empty' : 'data');
      this.renderMarkers(locations);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al cargar las ubicaciones.');
      this.state.set('error');
    }
  }

  private renderMarkers(locations: Location[]): void {
    if (!this.map) return;

    this.markers.forEach((m) => m.remove());
    this.markers = [];

    for (const loc of locations) {
      const deviceCount = loc.devices?.[0]?.count ?? 0;
      const marker = L.marker([loc.latitude, loc.longitude])
        .addTo(this.map)
        .bindPopup(`<strong>${loc.name}</strong><br>${deviceCount} dispositivo(s)`);
      this.markers.push(marker);
    }

    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map((l) => [l.latitude, l.longitude] as [number, number]));
      this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
  }

  deviceCount(loc: Location): number {
    return loc.devices?.[0]?.count ?? 0;
  }

  openCreateDialog(): void {
    this.openDialog({ mode: 'create' });
  }

  openEditDialog(location: Location): void {
    this.openDialog({ mode: 'edit', location });
  }

  async remove(location: Location): Promise<void> {
    const deviceCount = this.deviceCount(location);
    const message =
      deviceCount > 0
        ? `"${location.name}" tiene ${deviceCount} dispositivo(s) asignados; se quedarán sin ubicación. ¿Eliminar de todas formas?`
        : `¿Eliminar "${location.name}"?`;
    if (!confirm(message)) return;

    const result = await this.locationsService.deleteLocation(location.id);
    if (result.ok) {
      void this.load();
    } else {
      this.errorMessage.set(result.message ?? 'No se pudo eliminar la ubicación.');
    }
  }

  private openDialog(data: LocationFormDialogData): void {
    const ref = this.dialog.open(LocationFormDialog, { data, width: '520px' });
    ref.afterClosed().subscribe((changed) => {
      if (changed) void this.load();
    });
  }
}
