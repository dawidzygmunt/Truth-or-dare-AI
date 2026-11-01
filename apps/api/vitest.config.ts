import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC instead of esbuild/oxc: Nest DI needs decorator metadata.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: { conditions: ['@tod/source'] },
  test: { include: ['src/**/*.test.ts', 'test/**/*.test.ts'] },
});
