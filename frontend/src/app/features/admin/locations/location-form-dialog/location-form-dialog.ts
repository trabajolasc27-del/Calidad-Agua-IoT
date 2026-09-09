import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, ViewChild, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as L from 'leaflet';

import { LocationsService } from '../locations.service';
import { fixLeafletDefaultIcon } from '../../../../core/leaflet-icon-fix';
import type { Location } from '../../../../core/models/location.model';

export interface LocationFormDialogData {
  mode: 'create' | 'edit';
  location?: Location;
}

// Centro por defecto para una ubicacion nueva (Villahermosa, Tabasco),
// solo para no arrancar el mapa en medio del oceano; el admin mueve el
// marcador o teclea las coordenadas reales.
const DEFAULT_CENTER: [number, number] = [17.9869, -92.9303];

@Component({
  selector: 'wq-location-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './location-form-dialog.html',
  styleUrl: './location-form-dialog.scss',
})
export class LocationFormDialog implements AfterViewInit, OnDestroy {
  @ViewChild('pickerMap') private readonly mapElement!: ElementRef<HTMLDivElement>;

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl(''),
    latitude: new FormControl(DEFAULT_CENTER[0], { nonNullable: true, validators: [Validators.required] }),
    longitude: new FormControl(DEFAULT_CENTER[1], { nonNullable: true, validators: [Validators.required] }),
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private map?: L.Map;
  private marker?: L.Marker;

  constructor(
    private readonly dialogRef: MatDialogRef<LocationFormDialog, boolean>,
    private readonly locationsService: LocationsService,
    @Inject(MAT_DIALOG_DATA) public readonly data: LocationFormDialogData,
  ) {
    if (data.mode === 'edit' && data.location) {
      const loc = data.location;
      this.form.patchValue({
        name: loc.name,
        description: loc.description ?? '',
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
    }

    // Si el usuario teclea coordenadas manualmente, el marcador las sigue.
    this.form.controls.latitude.valueChanges.subscribe(() => this.syncMarkerFromForm());
    this.form.controls.longitude.valueChanges.subscribe(() => this.syncMarkerFromForm());
  }

  ngAfterViewInit(): void {
    fixLeafletDefaultIcon();

    const start: [number, number] = [this.form.controls.latitude.value, this.form.controls.longitude.value];

    this.map = L.map(this.mapElement.nativeElement).setView(start, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    this.marker = L.marker(start, { draggable: true }).addTo(this.map);
    this.marker.on('dragend', () => this.syncFormFromMarker());
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.marker!.setLatLng(e.latlng);
      this.syncFormFromMarker();
    });

    // El dialogo anima su apertura; el mapa necesita recalcular su tamano
    // una vez que ya tiene las dimensiones finales.
    setTimeout(() => this.map?.invalidateSize(), 150);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private syncFormFromMarker(): void {
    const pos = this.marker!.getLatLng();
    this.form.patchValue(
      { latitude: Math.round(pos.lat * 1e6) / 1e6, longitude: Math.round(pos.lng * 1e6) / 1e6 },
      { emitEvent: false },
    );
  }

  private syncMarkerFromForm(): void {
    const lat = this.form.controls.latitude.value;
    const lng = this.form.controls.longitude.value;
    if (this.marker && Number.isFinite(lat) && Number.isFinite(lng)) {
      this.marker.setLatLng([lat, lng]);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { name, description, latitude, longitude } = this.form.getRawValue();
    const input = { name, description: description || null, latitude, longitude };

    const result =
      this.data.mode === 'create'
        ? await this.locationsService.createLocation(input)
        : await this.locationsService.updateLocation(this.data.location!.id, input);

    this.submitting.set(false);

    if (!result.ok) {
      this.errorMessage.set(result.message ?? 'No se pudo guardar la ubicación.');
      return;
    }
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
