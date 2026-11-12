// Lance une commande avec les variables du Supabase LOCAL (npx supabase start).
// Usage : node scripts/with-local-supabase.mjs <commande> [arguments...]
import { execSync, spawnSync } from 'node:child_process';

let status;
try {
  status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
} catch {
  console.error('Supabase local ne tourne pas. Lancez d\'abord : npx supabase start');
  process.exit(1);
}

const env = {
  ...process.env,
  TEST_SUPABASE_URL: status.API_URL,
  TEST_SUPABASE_ANON_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
  TEST_SUPABASE_SERVICE_KEY: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY,
  TEST_DB_URL: status.DB_URL,
  TEST_MAILPIT_URL: status.MAILPIT_URL ?? status.INBUCKET_URL,
  VITE_SUPABASE_URL: status.API_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
};

const [cmd, ...args] = process.argv.slice(2);
const result = spawnSync(cmd, args, { env, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(result.status ?? 1);
