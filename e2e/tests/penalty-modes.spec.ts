import { DeckResponseSchema } from '@tod/contracts';
import { expect, test } from '@playwright/test';
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
  type CardChoice,
} from './helpers/app.js';

const [ania, bartek, czesia] = PLAYERS;

test.describe('shots mode', () => {
  test('"not done" shows the penalty of that player, and "next" moves on without it', async ({
    page,
  }) => {
    await openAsGuest(page);
    await startGame(page, { penaltyMode: 'shots' });
    await drawCard(page, 'truth');

    await markNotDone(page);

    const penalty = await readPenalty(page);
    expect(penalty.player).toBe(ania);
    expect(Number.isInteger(penalty.shots)).toBe(true);
    expect(penalty.shots).toBeGreaterThan(0);
    await expect(page.getByTestId('next-turn')).toBeVisible();
    await expect(page.getByTestId('choose-truth')).toBeHidden();

    await page.getByTestId('next-turn').click();

    await expectCurrentPlayer(page, bartek);
    await expect(page.getByTestId('penalty')).toBeHidden();
    await expect(page.getByTestId('choose-truth')).toBeVisible();
  });

  test('"done" moves straight to the next player with no penalty', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page, { penaltyMode: 'shots' });
    await drawCard(page, 'dare');

    await markDone(page);

    await expectCurrentPlayer(page, bartek);
    await expect(page.getByTestId('penalty')).toBeHidden();
    await expect(page.getByTestId('next-turn')).toBeHidden();
  });

  test('penalties never add up: every one is the value of a single card', async ({
    page,
    request,
  }) => {
    // The largest penalty a single card can carry, read from the deck the app itself loads.
    const response = await request.get(`/api/editions/${EDITION_SLUG}/deck`);
    expect(response.ok()).toBe(true);
    const deck = DeckResponseSchema.parse(await response.json());
    const mostShotsOnOneCard = Math.max(...deck.cards.map((card) => card.penaltyShots ?? 1));

    await openAsGuest(page);
    await startGame(page, { penaltyMode: 'shots' });

    // Nine failures in a row: each player fails three times. Summed, the third penalty of one
    // player would be at least three, above any single card in the seed.
    const rounds = 3;
    const choices: readonly CardChoice[] = ['truth', 'dare'];
    for (let turn = 0; turn < rounds * PLAYERS.length; turn += 1) {
      const player = PLAYERS[turn % PLAYERS.length] ?? '';
      await expectCurrentPlayer(page, player);
      await drawCard(page, choices[turn % choices.length] ?? 'truth');
      await markNotDone(page);

      const penalty = await readPenalty(page);
      expect(penalty.player).toBe(player);
      expect(Number.isInteger(penalty.shots)).toBe(true);
      expect(penalty.shots).toBeGreaterThan(0);
      expect(penalty.shots).toBeLessThanOrEqual(mostShotsOnOneCard);
      await expect(page.getByTestId('penalty')).toHaveCount(1);

      await page.getByTestId('next-turn').click();
    }

    await expectCurrentPlayer(page, ania);
  });
});

test.describe('none mode', () => {
  test('"not done" goes straight to the next player with no penalty', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page, { penaltyMode: 'none' });
    await drawCard(page, 'truth');

    await markNotDone(page);

    await expectCurrentPlayer(page, bartek);
    await expect(page.getByTestId('choose-truth')).toBeVisible();
    await expect(page.getByTestId('penalty')).toBeHidden();
    await expect(page.getByTestId('next-turn')).toBeHidden();
  });

  test('a whole round of failures never shows a penalty', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page, { penaltyMode: 'none' });

    const upcoming = [bartek, czesia, ania];
    for (const [index, player] of [ania, bartek, czesia].entries()) {
      await expectCurrentPlayer(page, player);
      await drawCard(page, 'dare');
      await markNotDone(page);
      await expectCurrentPlayer(page, upcoming[index] ?? '');
      await expect(page.getByTestId('penalty')).toBeHidden();
    }
  });
});
