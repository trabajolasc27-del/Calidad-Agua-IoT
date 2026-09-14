// Refleja public.perfiles y el enum public.rol_usuario
// (ver docs/DATABASE_DESIGN.md 3.1 y docs/ROLE_MATRIX.md).

export type UserRole = 'administrador' | 'analista' | 'tecnico_campo';

export interface Profile {
  id: string;
  nombre_completo: string | null;
  correo: string | null;
  rol: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  administrador: 'Administrador',
  analista: 'Analista ambiental',
  tecnico_campo: 'Técnico de campo',
};
