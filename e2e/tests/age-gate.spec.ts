import { expect, test } from '@playwright/test';
import { EDITION_SLUG, confirmAge } from './helpers/app.js';

test.describe('age gate', () => {
  test('first launch asks for age and keeps the catalog hidden', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('age-gate-confirm')).toBeVisible();
    await expect(page.getByTestId('age-gate-decline')).toBeVisible();
    await expect(page.getByTestId(`edition-${EDITION_SLUG}`)).toBeHidden();
  });

  test('confirmation is remembered after a reload', async ({ page }) => {
    await page.goto('/');
    await confirmAge(page);

    await page.reload();

    await expect(page.getByTestId(`edition-${EDITION_SLUG}`)).toBeVisible();
    await expect(page.getByTestId('age-gate-confirm')).toBeHidden();
  });

  test('declining does not let the player into the app', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('age-gate-decline').click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Aplikacja jest tylko dla pełnoletnich',
    );
    await expect(page.getByTestId(`edition-${EDITION_SLUG}`)).toBeHidden();
    await expect(page.getByTestId('age-gate-confirm')).toBeHidden();
  });

  test('declining is not remembered: the next launch asks again', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-gate-decline').click();

    await page.reload();

    await expect(page.getByTestId('age-gate-confirm')).toBeVisible();
    await expect(page.getByTestId(`edition-${EDITION_SLUG}`)).toBeHidden();
  });

  test('a deep link to the game does not bypass the gate', async ({ page }) => {
    await page.goto('/game');

    await expect(page.getByTestId('age-gate-confirm')).toBeVisible();
    await expect(page.getByTestId('current-player')).toBeHidden();
  });
});
