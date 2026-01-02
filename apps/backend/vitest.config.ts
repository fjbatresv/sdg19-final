import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['apps/backend/src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/apps/backend',
      reporter: ['lcov', 'text', 'text-summary', 'html'],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.config.js',
        '**/dist/**',
        '**/node_modules/**',
        'scripts/**',
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 80,
        functions: 80,
      },
    },
  },
});
