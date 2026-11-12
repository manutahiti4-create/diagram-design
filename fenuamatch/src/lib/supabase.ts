import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import type { Database } from '@/types/database';

export const supabase = createClient<Database>(env.supabaseUrl || 'http://localhost:54321', env.supabaseKey || 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: { headers: { 'x-client-info': 'fenuamatch-web' } },
});
