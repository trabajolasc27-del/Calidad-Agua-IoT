import { Component, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DeviceCredentialDialogData {
  deviceCode: string;
  secret: string;
}

// Muestra el secreto de un dispositivo UNA sola vez (D-003). No hay forma
// de volver a verlo despues de cerrar este dialogo -- si se pierde, hay
// que emitir uno nuevo (lo que invalida el anterior).
@Component({
  selector: 'wq-device-credential-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './device-credential-dialog.html',
  styleUrl: './device-credential-dialog.scss',
})
export class DeviceCredentialDialog {
  readonly copied = signal(false);

  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: DeviceCredentialDialogData) {}

  async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.data.secret);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Si el portapapeles no esta disponible, el usuario igual puede
      // seleccionar el texto manualmente; no es un error que deba bloquear nada.
    }
  }
}
