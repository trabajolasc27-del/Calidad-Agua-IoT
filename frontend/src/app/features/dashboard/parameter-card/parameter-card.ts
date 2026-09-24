import { Component, Input } from '@angular/core';

import type { LatestMeasurement } from '../../../core/models/measurement.model';
import { Gauge } from '../../../shared/gauge/gauge';

/**
 * Que es: envoltorio delgado que toma una LatestMeasurement (parametro +
 * ultima lectura + umbral activo) y se la pasa a <wq-gauge> con el
 * nombre del parametro como encabezado.
 *
 * Por que es un componente aparte y no se usa <wq-gauge> directo en
 * dashboard.html: el Dashboard necesita 4 de estas tarjetas en fila con
 * su propio marco/tarjeta visual (borde, padding, fondo) -- wq-gauge en
 * cambio es deliberadamente "desnudo" (solo el svg + la pildora de
 * estado) para poder reusarse tambien en Reportes con un contenedor
 * distinto, sin arrastrar el estilo de tarjeta del Dashboard.
 */
@Component({
  selector: 'wq-parameter-card',
  standalone: true,
  imports: [Gauge],
  templateUrl: './parameter-card.html',
  styleUrl: './parameter-card.scss',
})
export class ParameterCard {
  @Input({ required: true }) measurement!: LatestMeasurement;
}
