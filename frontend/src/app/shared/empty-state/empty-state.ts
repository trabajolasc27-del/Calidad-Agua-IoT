import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Estado vacío/error reutilizable. Cada pantalla ya distinguía
 * cargando/datos/vacío/error con sus propios `@switch`, pero el marcado
 * del caso "vacío" y "error" (icono + mensaje + acción opcional) se
 * repetía casi idéntico en cada una -- este componente centraliza solo esa
 * parte visual; la lógica de qué estado mostrar sigue en cada pantalla.
 */
@Component({
  selector: 'wq-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="wq-empty" [class.error]="tone() === 'error'">
      <mat-icon aria-hidden="true">{{ icon() }}</mat-icon>
      <p class="message">{{ message() }}</p>
      <ng-content />
    </div>
  `,
  styles: [
    `
      .wq-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6rem;
        padding: 2.5rem 1rem;
        text-align: center;
        color: var(--wq-text-soft);

        mat-icon {
          font-size: 2.25rem;
          height: 2.25rem;
          width: 2.25rem;
          opacity: 0.6;
        }

        &.error mat-icon {
          color: var(--wq-crit);
          opacity: 1;
        }
      }
      .message {
        margin: 0;
        font-size: 0.9rem;
        max-width: 32ch;
      }
    `,
  ],
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly message = input.required<string>();
  readonly tone = input<'empty' | 'error'>('empty');
}
