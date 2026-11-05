import { expect, test } from '@playwright/test';
import {
  EDITION_SLUG,
  PLAYERS,
  addPlayers,
  drawCard,
  expectCurrentPlayer,
  markDone,
  openAsGuest,
  startGame,
  type CardChoice,
} from './helpers/app.js';

const [ania, bartek, czesia] = PLAYERS;

test.describe('guest game', () => {
  test('five truth-or-dare turns follow the player order and wrap after the third', async ({
    page,
  }) => {
    await openAsGuest(page);
    await startGame(page);

    // Alternating the choice shows both kinds without the test knowing which card will come.
    const turns: readonly { readonly player: string; readonly choice: CardChoice }[] = [
      { player: ania, choice: 'truth' },
      { player: bartek, choice: 'dare' },
      { player: czesia, choice: 'truth' },
      { player: ania, choice: 'dare' },
      { player: bartek, choice: 'truth' },
    ];

    for (const { player, choice } of turns) {
      await expectCurrentPlayer(page, player);
      await drawCard(page, choice);
      // The turn is still the same player's while the card is on the screen.
      await expectCurrentPlayer(page, player);
      await markDone(page);
    }

    await expectCurrentPlayer(page, czesia);
    await expect(page.getByTestId('choose-truth')).toBeVisible();
    await expect(page.getByTestId('choose-dare')).toBeVisible();
  });

  test('the players list in setup keeps the order they were added in', async ({ page }) => {
    await openAsGuest(page);
    await page.getByTestId(`edition-${EDITION_SLUG}`).click();

    await addPlayers(page, PLAYERS);

    // Each item also holds the remove button, so match the name as part of its text.
    await expect(page.getByTestId('player-item')).toContainText(PLAYERS);
  });

  test('starting with fewer than two players shows an error and stays in setup', async ({
    page,
  }) => {
    await openAsGuest(page);
    await page.getByTestId(`edition-${EDITION_SLUG}`).click();
    await addPlayers(page, [ania]);

    await page.getByTestId('start-game').click();

    await expect(page.getByTestId('setup-error')).toBeVisible();
    await expect(page.getByTestId('current-player')).toBeHidden();
    await expect(page.getByTestId('player-name-input')).toBeVisible();
  });

  test('ending the game returns to the catalog without a game to resume', async ({ page }) => {
    await openAsGuest(page);
    await startGame(page);

    await page.getByTestId('end-game').click();

    await expect(page.getByTestId(`edition-${EDITION_SLUG}`)).toBeVisible();
    await expect(page.getByTestId('resume-game')).toBeHidden();
  });
});
