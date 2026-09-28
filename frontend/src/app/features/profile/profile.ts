import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../core/auth.service';
import { ROLE_LABELS } from '../../core/models/profile.model';
import { PageHeader } from '../../shared/page-header/page-header';
import { ConfirmService } from '../../shared/confirm-dialog/confirm.service';

// Perfil (Fase 4 §9 del rediseño): nombre, correo y rol en solo lectura
// (el rol solo lo cambia un administrador desde Administración > Usuarios,
// ver ROLE_MATRIX.md), cambio de contraseña propia, y cierre de otras
// sesiones activas -- ambas reutilizan metodos ya existentes de
// AuthService (setPassword/signOutOtherSessions), no se reimplementa nada
// de Supabase Auth aqui.
@Component({
  selector: 'wq-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, PageHeader],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  readonly roleLabels = ROLE_LABELS;

  readonly hidePassword = signal(true);
  readonly hideConfirm = signal(true);

  readonly passwordForm = new FormGroup(
    {
      password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
      confirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: (group) => (group.get('password')?.value === group.get('confirm')?.value ? null : { mismatch: true }) },
  );

  readonly passwordSubmitting = signal(false);
  readonly passwordMessage = signal<string | null>(null);
  readonly passwordMessageTone = signal<'ok' | 'error'>('ok');

  readonly sessionsSubmitting = signal(false);
  readonly sessionsMessage = signal<string | null>(null);
  readonly sessionsMessageTone = signal<'ok' | 'error'>('ok');

  constructor(
    protected readonly authService: AuthService,
    private readonly confirmService: ConfirmService,
  ) {}

  async changePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.passwordSubmitting.set(true);
    this.passwordMessage.set(null);

    const result = await this.authService.setPassword(this.passwordForm.controls.password.value);

    this.passwordSubmitting.set(false);
    this.passwordMessageTone.set(result.ok ? 'ok' : 'error');
    this.passwordMessage.set(result.ok ? 'Contraseña actualizada correctamente.' : (result.message ?? 'No se pudo actualizar la contraseña.'));
    if (result.ok) this.passwordForm.reset();
  }

  async closeOtherSessions(): Promise<void> {
    const confirmed = await this.confirmService.ask({
      title: 'Cerrar otras sesiones',
      message: 'Se cerrará tu sesión en cualquier otro navegador o dispositivo donde hayas iniciado sesión. Esta sesión seguirá activa.',
      confirmLabel: 'Cerrar otras sesiones',
    });
    if (!confirmed) return;

    this.sessionsSubmitting.set(true);
    this.sessionsMessage.set(null);
    const result = await this.authService.signOutOtherSessions();
    this.sessionsSubmitting.set(false);
    this.sessionsMessageTone.set(result.ok ? 'ok' : 'error');
    this.sessionsMessage.set(result.ok ? 'Se cerraron las demás sesiones.' : (result.message ?? 'No se pudo completar la acción.'));
  }
}
