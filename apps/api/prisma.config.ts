import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7 does not load .env by itself. CI and tests pass DATABASE_URL through the environment.
try {
  process.loadEnvFile(resolve(import.meta.dirname, '../../.env'));
} catch {
  // No .env file: rely on the process environment.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'pnpm run db:seed' },
  // Not env(): it throws when unset, and `prisma generate` must work on a fresh clone without a database.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
