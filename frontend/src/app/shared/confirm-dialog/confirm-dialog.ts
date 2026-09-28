import { Component, inject } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' pinta el botón de confirmar en rojo (desactivar, eliminar, cerrar alerta). */
  tone?: 'default' | 'danger';
}

/**
 * Confirmación genérica reutilizable para cualquier acción importante o
 * destructiva (activar/desactivar dispositivo, eliminar ubicación, cambiar
 * estado de una alerta, renovar una credencial). Antes varias de estas
 * acciones se ejecutaban de inmediato al hacer clic, sin paso de
 * confirmación -- este diálogo centraliza ese paso en vez de que cada
 * pantalla implemente su propio `confirm()` de navegador (inconsistente
 * visualmente y no accesible por teclado de la misma forma que un diálogo
 * de Material).
 */
@Component({
  selector: 'wq-confirm-dialog',
  standalone: true,
  imports: [A11yModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>
      @if (data.tone === 'danger') {
        <mat-icon aria-hidden="true" class="warn-icon">warning</mat-icon>
      }
      {{ data.title }}
    </h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="ref.close(false)">{{ data.cancelLabel ?? 'Cancelar' }}</button>
      <button
        mat-flat-button
        [color]="data.tone === 'danger' ? 'warn' : 'primary'"
        (click)="ref.close(true)"
        cdkFocusInitial
      >
        {{ data.confirmLabel ?? 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      h2 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .warn-icon {
        color: var(--wq-crit);
      }
      mat-dialog-content {
        color: var(--wq-text-soft);
      }
    `,
  ],
})
export class ConfirmDialog {
  readonly ref = inject(MatDialogRef<ConfirmDialog, boolean>);
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
