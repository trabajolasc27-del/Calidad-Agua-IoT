import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { PageHeader } from '../../shared/page-header/page-header';

interface TechItem {
  nombre: string;
  icon: string;
  funcion: string;
  variable: string;
  unidad: string;
  rango: string | null;
  recomendaciones: string | null;
  modeloPendiente: boolean;
}

// Información técnica (Fase 4 §10 del rediseño). El contenido se limita a
// lo que ya está documentado en el proyecto (docs/REQUIREMENTS.md,
// docs/ARCHITECTURE.md, docs/MANUAL_ACTIONS.md, catálogo real de
// `parametros` en la base de datos): función, variable medida, unidad y
// rango físico usado en el proyecto. NINGÚN modelo exacto de sensor está
// documentado todavía -- el sensor de oxígeno disuelto y el de
// temperatura ni siquiera se han seleccionado (ver MANUAL_ACTIONS.md #3) --
// así que esta pantalla lo marca explícitamente como pendiente en vez de
// inventar un modelo o datasheet.
const ITEMS: TechItem[] = [
  {
    nombre: 'Sensor de pH',
    icon: 'science',
    funcion: 'Mide la acidez o alcalinidad del agua.',
    variable: 'pH',
    unidad: 'pH (escala 0–14)',
    rango: '0 a 14',
    recomendaciones: 'Requiere calibración periódica con soluciones buffer (ver bitácora de Calibraciones y mantenimiento).',
    modeloPendiente: true,
  },
  {
    nombre: 'Sensor de oxígeno disuelto',
    icon: 'bubble_chart',
    funcion: 'Mide la concentración de oxígeno disuelto en el agua, un indicador clave de la capacidad del cuerpo de agua para sostener vida acuática.',
    variable: 'Oxígeno disuelto',
    unidad: 'mg/L',
    rango: '0 a 20',
    recomendaciones: null,
    modeloPendiente: true,
  },
  {
    nombre: 'Sensor de turbidez',
    icon: 'blur_on',
    funcion: 'Mide la cantidad de partículas en suspensión que dispersan la luz en el agua.',
    variable: 'Turbidez',
    unidad: 'NTU',
    rango: '0 a 4000',
    recomendaciones: 'Limpiar el lente óptico periódicamente para evitar lecturas falsas por suciedad acumulada.',
    modeloPendiente: true,
  },
  {
    nombre: 'Sensor de temperatura',
    icon: 'thermostat',
    funcion: 'Mide la temperatura del agua; también se usa habitualmente para compensar las lecturas de pH y oxígeno disuelto, sensibles a la temperatura.',
    variable: 'Temperatura',
    unidad: '°C',
    rango: '-5 a 50',
    recomendaciones: 'Debe ser apto para inmersión continua.',
    modeloPendiente: true,
  },
  {
    nombre: 'ESP32',
    icon: 'memory',
    funcion: 'Microcontrolador con WiFi que lee los 4 sensores y envía cada lote de mediciones por HTTPS a la plataforma.',
    variable: 'Controlador / pasarela de datos',
    unidad: '—',
    rango: null,
    recomendaciones: 'Se autentica ante la plataforma con una credencial propia por dispositivo, emitida y revocable desde Administración > Dispositivos.',
    modeloPendiente: false,
  },
];

@Component({
  selector: 'wq-tech-info',
  standalone: true,
  imports: [MatIconModule, PageHeader],
  templateUrl: './tech-info.html',
  styleUrl: './tech-info.scss',
})
export class TechInfo {
  readonly items = ITEMS;
}
