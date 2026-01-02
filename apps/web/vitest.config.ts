import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/web',
      reporter: ['lcov', 'text', 'text-summary'],
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/dist/**',
        '**/node_modules/**',
      ],
    },
  },
});
