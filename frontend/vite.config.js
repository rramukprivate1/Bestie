import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  // HTTPS is opt-in (via `npm run dev:https`), not the default - see
  // package.json. Plain `npm run dev` stays on http://localhost, which
  // already satisfies the browser's "secure context" requirement for the
  // Web Crypto API without needing a certificate at all. HTTPS only
  // matters when testing from a phone over a LAN IP, which localhost
  // doesn't cover - see the frontend README's "Get it on your phone" section.
  server: process.env.VITE_USE_HTTPS ? { https: true } : undefined,
  plugins: [
    react(),
    tailwindcss(),
    process.env.VITE_USE_HTTPS && basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Companion',
        short_name: 'Companion',
        description: 'Your personal companion for the day-to-day, the hard days, and everything in between.',
        theme_color: '#1E1B2E',
        background_color: '#1E1B2E',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
