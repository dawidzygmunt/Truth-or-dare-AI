import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * Rule overrides shared by the type-aware root config and the boundaries tests.
 * @type {import('eslint').Linter.RulesRecord}
 */
export const typescriptRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/ban-ts-comment': [
    'error',
    { 'ts-ignore': 'allow-with-description', minimumDescriptionLength: 10 },
  ],
};

/** Syntax-only TypeScript config (no type information needed). */
export const typescriptConfig = defineConfig({
  files: ['**/*.ts', '**/*.tsx'],
  extends: [tseslint.configs.strict],
  rules: typescriptRules,
});
