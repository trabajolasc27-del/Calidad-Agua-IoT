import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../environments/environment';

// Cliente unico de Supabase para todo el frontend. Usa siempre el anon key
// (protegido por RLS); la service_role key nunca vive aqui (RNF-04).
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
}
