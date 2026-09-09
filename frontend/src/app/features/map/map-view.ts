import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as L from 'leaflet';

import { AuthService } from '../../core/auth.service';
import { MapService, type MapLocation } from './map.service';
import { fixLeafletDefaultIcon } from '../../core/leaflet-icon-fix';

type ViewState = 'loading' | 'data' | 'empty' | 'error';

// Ubicaciones y mapa (RF-10), de solo lectura, para todos los roles. La
// administracion de ubicaciones (RF-09, con edicion) vive aparte en
// Administracion > Ubicaciones.
@Component({
  selector: 'wq-map-view',
  standalone: true,
  imports: [RouterLink, MatToolbarModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './map-view.html',
  styleUrl: './map-view.scss',
})
export class MapView implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') private readonly mapElement!: ElementRef<HTMLDivElement>;

  readonly state = signal<ViewState>('loading');
  readonly locations = signal<MapLocation[]>([]);
  readonly errorMessage = signal<string | null>(null);

  private map?: L.Map;

  constructor(
    protected readonly authService: AuthService,
    private readonly mapService: MapService,
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
      const locations = await this.mapService.listLocationsWithDevices();
      this.locations.set(locations);
      this.state.set(locations.length === 0 ? 'empty' : 'data');
      this.renderMarkers(locations);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al cargar el mapa.');
      this.state.set('error');
    }
  }

  private renderMarkers(locations: MapLocation[]): void {
    if (!this.map) return;

    for (const loc of locations) {
      const devicesHtml =
        loc.devices.length === 0
          ? '<p>Sin dispositivos.</p>'
          : `<ul>${loc.devices
              .map(
                (d) =>
                  `<li><code>${d.code}</code> — ${d.name} · <strong class="${d.status === 'active' ? 'ok' : 'inactive'}">${
                    d.status === 'active' ? 'Activo' : 'Inactivo'
                  }</strong></li>`,
              )
              .join('')}</ul>`;

      L.marker([loc.latitude, loc.longitude])
        .addTo(this.map!)
        .bindPopup(`<strong>${loc.name}</strong>${loc.description ? `<p>${loc.description}</p>` : ''}${devicesHtml}`);
    }

    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map((l) => [l.latitude, l.longitude] as [number, number]));
      this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
  }

  deviceCount(loc: MapLocation): number {
    return loc.devices.length;
  }
}
