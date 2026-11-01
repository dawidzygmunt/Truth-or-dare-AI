import { HealthResponseSchema } from '@tod/contracts';
import { expect, test } from '@playwright/test';

test('home page loads', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('api is reachable on the same origin under /api', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.ok()).toBe(true);
  expect(HealthResponseSchema.parse(await response.json())).toEqual({ status: 'ok' });
});
