import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: 'src/webview',
  base: './',
  build: {
    outDir: '../../dist/webview',
    emptyOutDir: true,
    sourcemap: true
  },
  test: {
    root: '.',
    include: ['tests/**/*.test.ts']
  }
});
