import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';
import type { Profile } from './models/profile.model';

export interface AuthResult {
  ok: boolean;
  message?: string;
}

// Estado de sesion centralizado con signals. UC-01 (inicio de sesion),
// RF-02 (cierre de sesion) y RF-03 (recuperacion de contrasena).
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionSignal = signal<Session | null>(null);
  private readonly profileSignal = signal<Profile | null>(null);
  private readonly readySignal = signal(false);

  readonly session = this.sessionSignal.asReadonly();
  readonly profile = this.profileSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly role = computed(() => this.profileSignal()?.role ?? null);

  // Resuelve una vez que se comprobo la sesion inicial (evita que un guard
  // redirija a /login por error mientras getSession() todavia esta en vuelo,
  // por ejemplo al recargar la pagina).
  private resolveReady!: () => void;
  readonly readyPromise = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  constructor(private readonly supabaseService: SupabaseService) {
    const client = this.supabaseService.client;

    client.auth.getSession().then(async ({ data }) => {
      this.sessionSignal.set(data.session);
      if (data.session) {
        await this.loadProfile(data.session.user.id);
      }
      this.readySignal.set(true);
      this.resolveReady();
    });

    client.auth.onAuthStateChange((_event, session) => {
      this.sessionSignal.set(session);
      if (session) {
        void this.loadProfile(session.user.id);
      } else {
        this.profileSignal.set(null);
      }
    });
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('No se pudo cargar el perfil del usuario', error.message);
      this.profileSignal.set(null);
      return;
    }

    this.profileSignal.set(data as Profile);
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await this.supabaseService.client.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, message: this.translateAuthError(error.message) };
    }
    return { ok: true };
  }

  async signOut(): Promise<void> {
    await this.supabaseService.client.auth.signOut();
  }

  async requestPasswordReset(email: string): Promise<AuthResult> {
    const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-contrasena`,
    });
    if (error) {
      return { ok: false, message: this.translateAuthError(error.message) };
    }
    return { ok: true };
  }

  private translateAuthError(message: string): string {
    if (message.toLowerCase().includes('invalid login credentials')) {
      return 'Correo o contraseña incorrectos.';
    }
    if (message.toLowerCase().includes('email not confirmed')) {
      return 'Debes confirmar tu correo antes de iniciar sesión.';
    }
    return 'No se pudo completar la operación. Intenta de nuevo en unos minutos.';
  }
}
