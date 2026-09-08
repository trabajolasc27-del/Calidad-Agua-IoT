import { Component, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { UsersService } from './users.service';
import { AuthService } from '../../../core/auth.service';
import type { Profile, UserRole } from '../../../core/models/profile.model';
import { ROLE_LABELS } from '../../../core/models/profile.model';
import { UserFormDialog, type UserFormDialogData } from './user-form-dialog/user-form-dialog';

type ViewState = 'loading' | 'data' | 'empty' | 'error';

// Administración > Usuarios (RF-06 a RF-08).
@Component({
  selector: 'wq-users',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule, MatDialogModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  readonly displayedColumns = ['full_name', 'email', 'role', 'is_active', 'actions'];

  roleLabel(role: UserRole): string {
    return ROLE_LABELS[role];
  }

  readonly state = signal<ViewState>('loading');
  readonly users = signal<Profile[]>([]);
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly usersService: UsersService,
    private readonly dialog: MatDialog,
    protected readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const users = await this.usersService.listProfiles();
      this.users.set(users);
      this.state.set(users.length === 0 ? 'empty' : 'data');
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Error al cargar los usuarios.');
      this.state.set('error');
    }
  }

  openCreateDialog(): void {
    this.openDialog({ mode: 'create' });
  }

  openEditDialog(profile: Profile): void {
    this.openDialog({ mode: 'edit', profile });
  }

  private openDialog(data: UserFormDialogData): void {
    const ref = this.dialog.open(UserFormDialog, { data, width: '480px' });
    ref.afterClosed().subscribe((changed) => {
      if (changed) {
        void this.load();
      }
    });
  }
}
