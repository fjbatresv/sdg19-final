import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['apps/infra/src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/apps/infra',
      reporter: ['lcov', 'text', 'text-summary'],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/dist/**',
        '**/node_modules/**',
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
