// Plantilla para desarrollo local. Copia este archivo como
// environment.development.ts (ese SI esta ignorado por Git, ver
// frontend/.gitignore) y pon ahi los valores reales de tu proyecto
// Supabase (Project Settings -> API). El anon key es publico por diseno
// (protegido por RLS), pero igual no se versiona para mantener el mismo
// criterio que .env.example en la raiz del repositorio.
export const environment = {
  production: false,
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabaseAnonKey: 'TU-ANON-KEY',
};
