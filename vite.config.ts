import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { BASE_PATH } from './scripts/prerender-document'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      injectManifest: {
        // woff2: the self-hosted font, so the installed app keeps it offline.
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
      },
      manifest: {
        name: 'AI Prompt URL Generator',
        short_name: 'AI Prompt URLs',
        description: 'Create shareable AI chat URLs with prefilled prompts',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        // The PNG files make the app installable on Android and give iOS a
        // home screen icon. The maskable one has no rounded corners and keeps
        // its mark inside the safe circle, so a launcher can cut any shape.
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: BASE_PATH,
  server: {
    // Vite blocks requests with an unrecognized Host header by default.
    // This allowlists Cloudflare Quick Tunnel hostnames so `bun dev` can be
    // shared for testing via `cloudflared tunnel --url http://localhost:5173`.
    allowedHosts: ['.trycloudflare.com'],
  },
})
