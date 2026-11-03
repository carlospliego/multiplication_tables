/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    // Disabled under vitest: no service worker / manifest generation during tests.
    ...(mode === 'test'
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
            workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'] },
            manifest: {
              name: 'Times Table Rocket',
              short_name: 'TT Rocket',
              display: 'standalone',
              orientation: 'any',
              background_color: '#0b1030',
              theme_color: '#0b1030',
              start_url: '.',
              scope: '.',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
          }),
        ]),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: 'src/test-setup.ts',
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
}));
