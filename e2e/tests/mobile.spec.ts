import { expect, test, type Locator } from '@playwright/test';
import { EDITION_SLUG, drawCard, openAsGuest, startGame } from './helpers/app.js';

/** Material and Apple guidance sit at 44-48 CSS px. */
const MIN_TAP_TARGET = 48;

async function expectTapTarget(locator: Locator): Promise<void> {
  const box = await locator.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(MIN_TAP_TARGET);
}

test.describe('mobile', () => {
  test('text links are full tap targets', async ({ page }) => {
    await openAsGuest(page);
    await expectTapTarget(page.getByTestId('install-link'));

    await page.getByTestId('install-link').click();
    await expectTapTarget(page.getByTestId('back-link'));

    await page.goto(`/setup/${EDITION_SLUG}`);
    await expectTapTarget(page.getByTestId('back-link'));
  });

  test('"end game" is a full tap target', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page);

    await expectTapTarget(page.getByTestId('end-game'));
  });

  test('the name field keeps focus after adding a player, for the keyboard', async ({ page }) => {
    await openAsGuest(page);
    await page.getByTestId(`edition-${EDITION_SLUG}`).click();

    await page.getByTestId('player-name-input').fill('Ania');
    await page.getByTestId('add-player').click();

    await expect(page.getByTestId('player-name-input')).toBeFocused();
  });

  test('focus follows the game from player to card', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page);
    await expect(page.getByTestId('current-player')).toBeFocused();

    await drawCard(page, 'truth');

    await expect(page.getByTestId('card')).toBeFocused();
  });

  test('the home watermark floats, unless reduced motion is requested', async ({ page }) => {
    const animation = () =>
      page.getByTestId('featured-mark').evaluate((mark) => getComputedStyle(mark).animationName);

    await openAsGuest(page);
    expect(await animation()).toBe('scfloat');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await animation()).toBe('none');
  });

  test('the safe area padding reaches the built stylesheet', async ({ page }) => {
    await openAsGuest(page);

    const css = await page.evaluate(() =>
      [...document.styleSheets]
        .flatMap((sheet) => [...sheet.cssRules])
        .map((rule) => rule.cssText)
        .join('\n'),
    );

    // Headless browsers report no insets, so this shows the rules ship, not a real notch.
    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(css).toContain(`safe-area-inset-${side}`);
    }
  });
});
