import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

// Valeurs du Supabase LOCAL (publiques, identiques pour toutes les installations locales).
export const SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY ?? '';
export const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY ?? '';
export const DB_URL = process.env.TEST_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

if (!ANON_KEY || !SERVICE_KEY) {
  throw new Error('Lancez les tests avec "npm run test:db" (les clés locales sont lues automatiquement).');
}
if (!/127\.0\.0\.1|localhost/.test(SUPABASE_URL) || !/127\.0\.0\.1|localhost/.test(DB_URL)) {
  throw new Error('Sécurité : les tests d\'intégration ne doivent JAMAIS viser une base distante.');
}

export const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

export function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Exécute du SQL avec le rôle postgres (préparation des scénarios de test uniquement). */
export function sql(query: string): string {
  return execFileSync('psql', [DB_URL, '-v', 'ON_ERROR_STOP=1', '-At', '-c', query], { encoding: 'utf8' }).trim();
}

export interface TestUser {
  id: string;
  email: string;
  username: string;
  client: SupabaseClient;
}

let counter = 0;
export async function createUser(type: 'client' | 'provider', opts: { adult?: boolean } = {}): Promise<TestUser> {
  counter += 1;
  const suffix = `${Date.now().toString(36)}${counter}`;
  const username = `t_${type.slice(0, 3)}_${suffix}`.slice(0, 24);
  const email = `${username}@example.test`;
  const password = 'motdepasse123';
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      account_type: type,
      adult_confirmed: String(opts.adult ?? true),
      terms_version: '2026-11',
    },
  });
  if (error) throw error;
  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, email, username, client };
}

// PNG 1x1 valide
export const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export function fileName(ext = 'png') {
  return `${randomUUID().replace(/-/g, '').slice(0, 20)}.${ext}`;
}

/** Crée une fiche prestataire publiée (avec photo de profil). */
export async function publishProvider(u: TestUser, opts: { name?: string; tradeSlug?: string; commune?: string; description?: string } = {}) {
  const path = `${u.id}/${fileName()}`;
  const up = await u.client.storage.from('avatars').upload(path, PNG_BYTES, { contentType: 'image/png' });
  if (up.error) throw up.error;
  const { error: e1 } = await u.client.from('profiles').update({ avatar_path: path }).eq('id', u.id);
  if (e1) throw e1;
  const trade = sql(`select id from public.trades where slug = '${opts.tradeSlug ?? 'electricien'}'`);
  const commune = sql(`select id from public.communes where slug = '${opts.commune ?? 'papeete'}'`);
  const { error } = await u.client.from('provider_profiles').insert({
    id: u.id,
    public_name: opts.name ?? `Pro ${u.username}`,
    description: opts.description ?? 'Interventions rapides, travail soigné.',
    main_trade_id: Number(trade),
    commune_id: Number(commune),
    is_published: true,
  });
  if (error) throw error;
}

export function communeId(slug: string): number {
  return Number(sql(`select id from public.communes where slug = '${slug}'`));
}
export function categoryId(slug: string): number {
  return Number(sql(`select id from public.categories where slug = '${slug}'`));
}

export async function createListing(u: TestUser, overrides: Record<string, unknown> = {}) {
  const { data, error } = await u.client.rpc('create_listing', {
    p_title: 'Installation de trois prises',
    p_description: 'Je recherche quelqu\'un pour installer trois prises électriques à Papara.',
    p_commune_id: communeId('papara'),
    p_category_ids: [categoryId('electricite')],
    p_budget_xpf: 15000,
    p_date_mode: 'flexible',
    p_desired_date: null,
    p_publish: true,
    ...overrides,
  });
  if (error) throw error;
  return data as string;
}
