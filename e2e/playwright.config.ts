import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const apiPort = 3100;
const webPort = 4173;

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
      command:
        'pnpm --filter "./packages/*" build && pnpm --filter @tod/api build && pnpm --filter @tod/api start',
      cwd: '..',
      url: `http://localhost:${apiPort}/health`,
      env: { PORT: String(apiPort) },
      reuseExistingServer: !isCI,
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
