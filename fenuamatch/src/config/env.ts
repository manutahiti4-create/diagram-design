const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const env = {
  supabaseUrl: url ?? '',
  supabaseKey: key ?? '',
  siteUrl: (import.meta.env.VITE_SITE_URL as string | undefined) || (typeof window !== 'undefined' ? window.location.origin : ''),
  isConfigured: Boolean(url && key),
};

function isSecretKey(k: string): boolean {
  if (k.startsWith('sb_secret_')) return true;
  if (k.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string };
      return payload.role === 'service_role';
    } catch {
      return false;
    }
  }
  return false;
}

if (key && isSecretKey(key)) {
  // Garde-fou : une clé secrète ne doit jamais être livrée au navigateur.
  throw new Error('Configuration dangereuse : une clé SECRÈTE Supabase a été fournie au frontend.');
}
