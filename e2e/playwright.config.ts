import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const apiPort = 3100;
const webPort = 4173;

// Own compose project and port: nothing here touches the dev database or whatever holds 5432.
// Values are explicit so that a local .env cannot redirect the tests to another database.
const database = { port: '55432', user: 'tod', password: 'tod', name: 'tod_e2e' };

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'iphone-webkit', use: { ...devices['iPhone 15'] } },
    { name: 'pixel-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: [
        'docker compose -p tod-e2e up -d --wait postgres',
        'pnpm --filter @tod/api prisma migrate deploy',
        'pnpm --filter @tod/api db:seed',
        'pnpm --filter "./packages/*" build',
        'pnpm --filter @tod/api build',
        'pnpm --filter @tod/api start',
      ].join(' && '),
      cwd: '..',
      url: `http://localhost:${apiPort}/health`,
      env: {
        PORT: String(apiPort),
        POSTGRES_PORT: database.port,
        POSTGRES_USER: database.user,
        POSTGRES_PASSWORD: database.password,
        POSTGRES_DB: database.name,
        DATABASE_URL: `postgresql://${database.user}:${database.password}@localhost:${database.port}/${database.name}`,
      },
      reuseExistingServer: !isCI,
      // The first run pulls the Postgres image before anything can start.
      timeout: 180_000,
    },
    {
      command: 'pnpm --filter @tod/web build && pnpm --filter @tod/web preview --strictPort',
      cwd: '..',
      url: `http://localhost:${webPort}`,
      env: { API_URL: `http://localhost:${apiPort}` },
      reuseExistingServer: !isCI,
    },
  ],
});
