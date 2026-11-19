import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./test/utils/silenciar-logs.ts'],
    environment: 'node',
  },
});
