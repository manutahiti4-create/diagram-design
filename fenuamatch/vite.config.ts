import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'FenuaMatch',
        short_name: 'FenuaMatch',
        description: 'Trouvez le bon prestataire à Tahiti.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F5F8FA',
        theme_color: '#0F2A5A',
        categories: ['business', 'lifestyle', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Seuls les fichiers de l'application sont mis en cache (jamais les données Supabase).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Polices : seuls les jeux de caractères latins sont pré-chargés (connexions lentes).
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*', '**/*-italic*', '**/og-image.png', '**/logo-1024.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/auth\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
  },
});
