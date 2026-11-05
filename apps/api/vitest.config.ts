import { resolve } from 'node:path';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC instead of esbuild/oxc: Nest DI needs decorator metadata.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    conditions: ['@tod/source'],
    // Vitest runs in the server environment, which ignores `resolve.conditions`, so without this
    // alias the tests would need a built packages/contracts/dist, which a fresh clone does not have.
    alias: { '@tod/contracts': resolve(import.meta.dirname, '../../packages/contracts/src/index.ts') },
  },
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts', 'prisma/**/*.test.ts'],
    // Testcontainers: pulling the image and applying migrations takes a while.
    hookTimeout: 120_000,
  },
});
