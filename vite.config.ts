import { defineConfig } from 'vite';

// GitHub Pages subpath compatible base.
// Override with VITE_BASE env for custom deploy paths.
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
  },
});
