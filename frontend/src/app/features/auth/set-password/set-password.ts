import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/auth.service';

// Pantalla a la que Supabase redirige tras el enlace de invitación (RF-06)
// o de recuperación de contraseña (RF-03). El propio cliente de Supabase
// ya establece la sesión a partir del token en la URL antes de que este
// componente cargue; aquí solo se pide la contraseña nueva.
@Component({
  selector: 'wq-set-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './set-password.html',
  styleUrl: './set-password.scss',
})
export class SetPassword implements OnInit {
  readonly form = new FormGroup({
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
  });

  readonly checking = signal(true);
  readonly linkInvalid = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly done = signal(false);

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hashError = hashParams.get('error_description');
    if (hashError) {
      this.errorMessage.set(decodeURIComponent(hashError.replace(/\+/g, ' ')));
      this.linkInvalid.set(true);
      this.checking.set(false);
      return;
    }

    await this.authService.readyPromise;
    if (!this.authService.isAuthenticated()) {
      this.errorMessage.set('El enlace no es válido o ya expiró. Solicita uno nuevo.');
      this.linkInvalid.set(true);
    }
    this.checking.set(false);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const result = await this.authService.setPassword(this.form.getRawValue().password);

    this.submitting.set(false);

    if (!result.ok) {
      this.errorMessage.set(result.message ?? 'No se pudo establecer la contraseña.');
      return;
    }

    this.done.set(true);
    setTimeout(() => void this.router.navigateByUrl('/panel'), 1500);
  }
}
