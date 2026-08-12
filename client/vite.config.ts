/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig } from 'vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig(({ command }) => ({
  plugins: [
    TanStackRouterVite(),
    viteReact({
      babel: {
        plugins: command === 'serve' ? ['@locator/babel-jsx/dist/index.js'] : [],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
  },
}));
