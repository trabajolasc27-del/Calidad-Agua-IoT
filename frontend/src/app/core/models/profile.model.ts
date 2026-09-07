// Refleja public.profiles y el enum public.user_role
// (ver docs/DATABASE_DESIGN.md 3.1 y docs/ROLE_MATRIX.md).

export type UserRole = 'admin' | 'analyst' | 'field_tech';

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
