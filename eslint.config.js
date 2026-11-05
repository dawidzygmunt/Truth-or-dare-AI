import { resolve } from 'node:path';
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { boundariesConfig } from './tooling/eslint/boundaries.js';
import { typescriptRules } from './tooling/eslint/typescript.js';

const root = import.meta.dirname;

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/dev-dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      'apps/api/src/generated/**',
      'tooling/eslint/__fixtures__/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: root },
    },
    rules: {
      ...typescriptRules,
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    // Nest modules are empty classes decorated with @Module.
    files: ['apps/api/src/**/*.module.ts'],
    rules: { '@typescript-eslint/no-extraneous-class': 'off' },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  ...boundariesConfig({
    rootPath: root,
    tsconfig: [
      'apps/*/tsconfig.json',
      'packages/*/tsconfig.json',
      'e2e/tsconfig.json',
      'tooling/tsconfig.json',
    ].map((path) => resolve(root, path)),
  }),
  prettier,
);
