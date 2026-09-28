import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import type { StatusTone } from '../status.util';

/**
 * Insignia de estado reutilizable (icono + texto + color) usada en
 * Dashboard, Historial, Alertas, Reportes, Mapa y Dispositivos. Sustituye
 * los `<span class="status-pill">`/`.wq-status-pill` que cada pantalla
 * repetía a mano con su propio marcado -- un componente en vez de una sola
 * clase CSS porque también centraliza el icono (RNF-02: comunicar
 * gravedad con texto+ícono, no solo color).
 */
@Component({
  selector: 'wq-status-badge',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <span class="wq-badge" [class]="tone()">
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      {{ label() }}
    </span>
  `,
  styles: [
    `
      .wq-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 0.2rem 0.65rem;
        border-radius: 999px;
        white-space: nowrap;
        line-height: 1.6;
      }
      mat-icon {
        font-size: 1rem;
        height: 1rem;
        width: 1rem;
      }
      .ok {
        background: var(--wq-ok-soft);
        color: var(--wq-ok);
      }
      .warn {
        background: var(--wq-warn-soft);
        color: var(--wq-warn);
      }
      .crit {
        background: var(--wq-crit-soft);
        color: var(--wq-crit);
      }
      .info {
        background: var(--wq-accent-soft);
        color: var(--wq-secondary);
      }
      .neutral {
        background: var(--wq-neutral-soft);
        color: var(--wq-text-soft);
      }
    `,
  ],
})
export class StatusBadge {
  readonly tone = input.required<StatusTone>();
  readonly label = input.required<string>();
  readonly icon = input.required<string>();
}
