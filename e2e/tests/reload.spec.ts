import { expect, test } from '@playwright/test';
import {
  PLAYERS,
  drawCard,
  expectCurrentPlayer,
  markDone,
  markNotDone,
  openAsGuest,
  readPenalty,
  startGame,
} from './helpers/app.js';

const [ania, bartek, czesia] = PLAYERS;

test.describe('reload in the middle of a game', () => {
  test('restores the player and the drawn card, and the game goes on', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page, { penaltyMode: 'shots' });
    await drawCard(page, 'truth');
    await markDone(page);
    await expectCurrentPlayer(page, bartek);
    await drawCard(page, 'dare');
    const kind = await page.getByTestId('card-kind').innerText();
    const text = await page.getByTestId('card-text').innerText();

    await page.reload();

    await expectCurrentPlayer(page, bartek);
    await expect(page.getByTestId('card-kind')).toHaveText(kind);
    await expect(page.getByTestId('card-text')).toHaveText(text);
    await expect(page.getByTestId('mark-done')).toBeEnabled();
    await expect(page.getByTestId('mark-not-done')).toBeEnabled();

    await markDone(page);
    await expectCurrentPlayer(page, czesia);
    await expect(page.getByTestId('choose-truth')).toBeVisible();
  });

  test('restores a turn where the choice has not been made yet', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page);

    await page.reload();

    await expectCurrentPlayer(page, ania);
    await expect(page.getByTestId('choose-truth')).toBeVisible();
    await expect(page.getByTestId('choose-dare')).toBeVisible();
    await expect(page.getByTestId('card-text')).toBeHidden();
  });

  test('restores a visible penalty, and "next" moves on from it', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page, { penaltyMode: 'shots' });
    await drawCard(page, 'dare');
    await markNotDone(page);
    const penalty = await readPenalty(page);
    const penaltyText = await page.getByTestId('penalty').innerText();

    await page.reload();

    await expect(page.getByTestId('penalty')).toHaveText(penaltyText);
    expect(await readPenalty(page)).toEqual(penalty);
    await expect(page.getByTestId('card-text')).toBeHidden();
    await expect(page.getByTestId('choose-truth')).toBeHidden();

    await page.getByTestId('next-turn').click();

    await expectCurrentPlayer(page, bartek);
    await expect(page.getByTestId('penalty')).toBeHidden();
  });

  test('a game left from the catalog can be resumed on the same turn', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page);
    await drawCard(page, 'truth');
    const text = await page.getByTestId('card-text').innerText();

    await page.goto('/');
    await page.getByTestId('resume-game').click();

    await expectCurrentPlayer(page, ania);
    await expect(page.getByTestId('card-text')).toHaveText(text);
  });
});
