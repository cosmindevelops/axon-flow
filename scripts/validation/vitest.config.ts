import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'validation',
    environment: 'node',
    include: ['iu-*/validators/**/*.spec.ts', 'shared/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/results/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['orchestrator/**/*.ts', 'shared/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.types.ts', '**/node_modules/**'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    testTimeout: 30000,
    setupFiles: [resolve(__dirname, './shared/utils/vitest-setup.ts')],
    reporters: 'default',
  },
  resolve: {
    alias: {
      '@validation': resolve(__dirname, '.'),
      '@validation/shared': resolve(__dirname, './shared'),
      '@validation/orchestrator': resolve(__dirname, './orchestrator'),
    },
  },
});
