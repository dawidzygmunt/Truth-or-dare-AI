import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const packageSource = (name: string) =>
  resolve(import.meta.dirname, `../../packages/${name}/src/index.ts`);

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['@tod/source'],
    // Vitest resolves workspace packages outside `resolve.conditions`, so without these aliases the
    // tests would need built `dist` folders, which a fresh clone does not have.
    alias: {
      '@tod/contracts': packageSource('contracts'),
      '@tod/game-engine': packageSource('game-engine'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
    unstubGlobals: true,
  },
});
