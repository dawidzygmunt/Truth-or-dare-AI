import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Web and api share one origin; in production a reverse proxy strips `/api`.
const apiProxy: Record<string, ProxyOptions> = {
  '/api': {
    target: process.env.API_URL ?? 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Truth or Dare',
        short_name: 'Truth or Dare',
        lang: 'pl',
        display: 'standalone',
        start_url: '/',
        background_color: '#111111',
        theme_color: '#111111',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  resolve: { conditions: ['@tod/source'] },
  server: { port: 5173, proxy: apiProxy },
  preview: { port: 4173, proxy: apiProxy },
});
