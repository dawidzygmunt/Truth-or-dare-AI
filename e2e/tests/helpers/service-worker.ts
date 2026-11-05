import { expect, type Page } from '@playwright/test';

/**
 * Waits until the service worker is active and actually controls this page.
 * `ready` alone is not enough: a page loaded before the worker existed is not controlled yet.
 * The worker warms its caches during `install`, so they are filled once it is active.
 */
export async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
}
