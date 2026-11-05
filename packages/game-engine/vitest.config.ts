import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['@tod/source'] },
  test: { include: ['src/**/*.test.ts'] },
});
