import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  EDITION_SLUG,
  PLAYERS,
  drawCard,
  expectCurrentPlayer,
  markDone,
  markNotDone,
  openAsGuest,
  readPenalty,
  startGame,
} from './helpers/app.js';
import { waitForServiceWorkerControl } from './helpers/service-worker.js';

const [ania, bartek, czesia] = PLAYERS;

/**
 * Waits until the service worker controls the page (its install step has filled the caches by
 * then), and only then cuts the network.
 */
async function goOffline(page: Page, context: BrowserContext): Promise<void> {
  await waitForServiceWorkerControl(page);

  await context.setOffline(true);

  // Guard against a test that passes only because the network is still there: a request the
  // worker does not cache has to fail now.
  await expect
    .poll(() =>
      page.evaluate(() =>
        fetch('/api/health').then(
          () => 'reached',
          () => 'failed',
        ),
      ),
    )
    .toBe('failed');
}

test.describe('offline after the first load', () => {
  test('a free edition can be set up and played without a network', async ({ page, context }) => {
    await openAsGuest(page);
    await goOffline(page, context);

    await startGame(page, { penaltyMode: 'shots' });
    await drawCard(page, 'truth');
    await markDone(page);
    await expectCurrentPlayer(page, bartek);
    await drawCard(page, 'dare');
    await markNotDone(page);
    const penalty = await readPenalty(page);
    expect(penalty.player).toBe(bartek);
    expect(penalty.shots).toBeGreaterThan(0);
    await page.getByTestId('next-turn').click();

    await expectCurrentPlayer(page, czesia);
    await expect(page.getByTestId('api-error')).toBeHidden();
  });

  test('the app opens from the cache after a reload without a network', async ({
    page,
    context,
  }) => {
    await openAsGuest(page);
    await goOffline(page, context);

    await page.reload();

    await expect(page.getByTestId(`edition-${EDITION_SLUG}`)).toBeVisible();
    await expect(page.getByTestId('api-error')).toBeHidden();
    await startGame(page);
    await drawCard(page, 'dare');
    await markDone(page);
    await expectCurrentPlayer(page, bartek);
  });

  test('a game in progress is restored after a reload without a network', async ({
    page,
    context,
  }) => {
    await openAsGuest(page);
    await startGame(page);
    await drawCard(page, 'truth');
    const text = await page.getByTestId('card-text').innerText();
    await goOffline(page, context);

    await page.reload();

    await expectCurrentPlayer(page, ania);
    await expect(page.getByTestId('card-text')).toHaveText(text);
    await markDone(page);
    await expectCurrentPlayer(page, bartek);
  });
});
