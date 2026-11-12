import { defineConfig, devices } from '@playwright/test';

// Tests de bout en bout : nécessitent Supabase local (npx supabase start) et les données de démo (npm run seed:demo).
// Lancer avec : npm run test:e2e
const executablePath = process.env.PW_CHROMIUM || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'fr-FR',
    timezoneId: 'Pacific/Tahiti',
    launchOptions: { executablePath },
    trace: 'off',
  },
  webServer: {
    // Build de production + serveur de prévisualisation (teste aussi le rafraîchissement des routes).
    command: 'npx vite build && npx vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium', launchOptions: { executablePath } }, testMatch: /responsive/ },
    { name: 'tablette', use: { ...devices['iPad (gen 7)'], browserName: 'chromium', launchOptions: { executablePath } }, testMatch: /responsive/ },
    { name: 'ordinateur', use: { viewport: { width: 1366, height: 860 }, launchOptions: { executablePath } }, testMatch: /responsive/ },
  ],
});
