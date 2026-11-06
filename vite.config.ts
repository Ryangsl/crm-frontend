/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// PWA: apenas cache de assets estaticos (D-041). Sem fila de escrita offline —
// ver crm-spec/docs/06-frontend/responsive.md secao 6.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'CRM Universal',
        short_name: 'CRM Universal',
        description: 'CRM Universal. Mais clientes. Mais resultados.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0b2545',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    // D-088: a empresa e identificada pelo endereco (empresa.localhost:5173 em desenvolvimento). O
    // proxy repassa /v1 ao backend SEM trocar o Host (changeOrigin: false), para o backend saber qual
    // empresa abriu a pagina. Subdominios de localhost ja sao aceitos pelo Vite.
    proxy: {
      '/v1': {
        target: process.env.CRM_API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: false,
      },
      // Status do sistema (/health e /health/ready): fora do /v1, nao depende da empresa.
      '/health': {
        target: process.env.CRM_API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
