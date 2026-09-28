import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { ConfirmDialog, type ConfirmDialogData } from './confirm-dialog';

/** Atajo para abrir ConfirmDialog y esperar la respuesta como boolean. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  async ask(data: ConfirmDialogData): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialog, { data, width: '420px' });
    const result = await firstValueFrom(ref.afterClosed());
    return result === true;
  }
}
