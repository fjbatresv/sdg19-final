import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['apps/web/src/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/apps/web',
      reporter: ['lcov', 'text', 'text-summary'],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.config.js',
        '**/dist/**',
        '**/node_modules/**',
        'scripts/**',
      ],
    },
  },
});
