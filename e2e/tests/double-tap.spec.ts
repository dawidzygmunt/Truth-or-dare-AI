import { expect, test, type Locator, type Page } from '@playwright/test';
import { EDITION_SLUG, addPlayers, drawCard, openAsGuest, startGame } from './helpers/app.js';

const TURNS = 8;

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

async function boxOf(locator: Locator): Promise<Box> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box === null) throw new Error('The element has no layout');
  return box;
}

/** Two real touches on one spot with no wait in between: what a double tap is. */
async function doubleTap(page: Page, locator: Locator): Promise<void> {
  const { x, y, width, height } = await boxOf(locator);
  await page.touchscreen.tap(x + width / 2, y + height / 2);
  await page.touchscreen.tap(x + width / 2, y + height / 2);
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test.describe('double tap', () => {
  test('on "done" never ends the game', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page);

    for (let turn = 0; turn < TURNS; turn += 1) {
      const done = page.getByTestId('mark-done');
      if (!(await done.isVisible())) {
        await drawCard(page, 'dare');
      }

      await doubleTap(page, done);

      await expect(page.getByTestId('current-player')).toBeVisible();
      await expect(page.getByTestId('end-game-confirm')).toBeHidden();
    }
  });

  test('"end game" never sits where a turn action was, whatever the card', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page);

    for (let turn = 0; turn < TURNS; turn += 1) {
      const truth = await boxOf(page.getByTestId('choose-truth'));
      const dare = await boxOf(page.getByTestId('choose-dare'));
      await drawCard(page, 'truth');
      const endGameOnCard = await boxOf(page.getByTestId('end-game'));
      const done = await boxOf(page.getByTestId('mark-done'));
      const notDone = await boxOf(page.getByTestId('mark-not-done'));
      await page.getByTestId('mark-done').click();
      await expect(page.getByTestId('choose-truth')).toBeVisible();
      const endGameOnChoice = await boxOf(page.getByTestId('end-game'));

      expect(overlaps(endGameOnChoice, done)).toBe(false);
      expect(overlaps(endGameOnChoice, notDone)).toBe(false);
      expect(overlaps(endGameOnCard, truth)).toBe(false);
      expect(overlaps(endGameOnCard, dare)).toBe(false);
    }
  });

  test('on "end game" only asks for confirmation', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page);

    await doubleTap(page, page.getByTestId('end-game'));

    await expect(page.getByTestId('end-game-confirm')).toBeVisible();
    await page.getByTestId('end-game-cancel').click();
    await expect(page.getByTestId('choose-truth')).toBeVisible();
  });

  test('on "start" does not replace a game in progress', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page);
    await page.goto(`/setup/${EDITION_SLUG}`);
    await addPlayers(page, ['Zosia', 'Janek']);
    const start = page.getByTestId('start-game');
    await expect(start).toBeEnabled();

    await doubleTap(page, start);

    await expect(page.getByTestId('replace-game-confirm')).toBeVisible();
    await page.getByTestId('replace-game-cancel').click();
    await page.goto('/game');
    await expect(page.getByTestId('current-player')).toHaveText('Ania');
  });
});
