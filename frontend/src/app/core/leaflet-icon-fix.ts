import * as L from 'leaflet';

// El build de Angular (esbuild) no resuelve automaticamente las imagenes
// que Leaflet referencia por CSS relativo para su marcador por defecto.
// Se apunta al mismo CDN que ya usamos para las demas librerias externas,
// fijando la version exacta instalada (1.9.4).
export function fixLeafletDefaultIcon(): void {
  const iconPrototype = L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown };
  delete iconPrototype._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}
