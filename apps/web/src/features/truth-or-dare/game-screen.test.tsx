import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PenaltyMode } from '@tod/game-engine';
import { describe, expect, it } from 'vitest';
import { pl } from '../../i18n/pl.js';
import { cardsFixture, catalogFixture } from '../../test/fixtures.js';
import { createMemoryStorage } from '../../test/memory-storage.js';
import { createTestStore, renderApp, stubApi } from '../../test/render-app.js';

function renderGame(penaltyMode: PenaltyMode = 'none') {
  const store = createTestStore();
  store.getState().start({ players: ['Ola', 'Kuba', 'Ania'], cards: cardsFixture, penaltyMode });
  renderApp({ route: '/game', store });
  return store;
}

const click = (name: string) => userEvent.click(screen.getByRole('button', { name }));

describe('GameScreen', () => {
  it('shows whose turn it is and asks for truth or dare', async () => {
    renderGame();

    expect(await screen.findByTestId('current-player')).toHaveTextContent('Ola');
    expect(screen.getByRole('button', { name: pl.game.truth })).toBeVisible();
    expect(screen.getByRole('button', { name: pl.game.dare })).toBeVisible();
    expect(screen.queryByRole('button', { name: pl.game.done })).not.toBeInTheDocument();
  });

  it('shows the drawn card with resolved placeholders', async () => {
    const store = renderGame();
    await screen.findByTestId('current-player');

    await click(pl.game.truth);

    expect(screen.getByTestId('card-kind')).toHaveTextContent(pl.game.truth);
    expect(screen.getByTestId('card-text')).toHaveTextContent(
      store.getState().game?.currentCard?.text ?? 'no card',
    );
    expect(screen.getByTestId('card-text')).toHaveTextContent(/^Ola, truth/);
    expect(screen.queryByRole('button', { name: pl.game.truth })).not.toBeInTheDocument();
  });

  it('moves to the next player after "done"', async () => {
    renderGame('shots');
    await screen.findByTestId('current-player');
    await click(pl.game.dare);

    await click(pl.game.done);

    expect(screen.getByTestId('current-player')).toHaveTextContent('Kuba');
    expect(screen.queryByTestId('penalty')).not.toBeInTheDocument();
  });

  it('moves straight to the next player after "not done" without penalties', async () => {
    renderGame('none');
    await screen.findByTestId('current-player');
    await click(pl.game.dare);

    await click(pl.game.notDone);

    expect(screen.getByTestId('current-player')).toHaveTextContent('Kuba');
    expect(screen.queryByTestId('penalty')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: pl.game.truth })).toBeVisible();
  });

  it('shows the card penalty after "not done" in shots mode, then continues', async () => {
    const store = renderGame('shots');
    await screen.findByTestId('current-player');
    await click(pl.game.dare);
    const shots = store.getState().game?.currentCard?.penaltyShots ?? 0;

    await click(pl.game.notDone);

    expect(screen.getByTestId('penalty')).toHaveTextContent(pl.game.penalty('Ola', shots));

    await click(pl.game.next);

    expect(screen.queryByTestId('penalty')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-player')).toHaveTextContent('Kuba');
  });

  it('shows the error of a rejected action by its code and keeps the game', async () => {
    const store = renderGame();
    await screen.findByTestId('current-player');

    act(() => {
      store.getState().dispatch({ type: 'complete' });
    });

    expect(screen.getByRole('alert')).toHaveTextContent(pl.gameErrors.action_not_allowed);
    expect(screen.getByTestId('current-player')).toHaveTextContent('Ola');
  });

  it('restores a game from storage after a reload', async () => {
    const storage = createMemoryStorage();
    const previous = createTestStore(storage);
    previous
      .getState()
      .start({ players: ['Ola', 'Kuba'], cards: cardsFixture, penaltyMode: 'none' });
    previous.getState().dispatch({ type: 'chooseDare' });
    const text = previous.getState().game?.currentCard?.text ?? 'no card';

    renderApp({ route: '/game', store: createTestStore(storage) });

    expect(await screen.findByTestId('card-text')).toHaveTextContent(text);
    expect(screen.getByTestId('current-player')).toHaveTextContent('Ola');
  });

  it('waits for hydration before deciding that there is no game', () => {
    renderApp({ route: '/game' });

    expect(screen.getByRole('status')).toHaveTextContent(pl.common.loading);
  });

  it('returns to the catalog when there is no game', async () => {
    stubApi({ '/api/catalog': { body: catalogFixture } });
    renderApp({ route: '/game' });

    expect(await screen.findByRole('heading', { level: 1, name: pl.catalog.title })).toBeVisible();
  });

  it('ends the game and returns to the catalog', async () => {
    stubApi({ '/api/catalog': { body: catalogFixture } });
    const store = renderGame();
    await screen.findByTestId('current-player');

    await userEvent.click(screen.getByTestId('end-game'));
    await userEvent.click(screen.getByTestId('end-game-confirm'));

    expect(store.getState().game).toBeNull();
    expect(await screen.findByRole('heading', { level: 1, name: pl.catalog.title })).toBeVisible();
  });

  it('keeps the game until ending it is confirmed', async () => {
    const store = renderGame();
    await screen.findByTestId('current-player');

    await userEvent.click(screen.getByTestId('end-game'));

    expect(store.getState().game).not.toBeNull();
    expect(screen.getByRole('alertdialog', { name: pl.game.endConfirm.title })).toBeVisible();
    expect(screen.getByTestId('end-game-cancel')).toHaveFocus();
  });

  it('returns to the turn when ending the game is cancelled', async () => {
    const store = renderGame();
    await screen.findByTestId('current-player');
    await click(pl.game.dare);
    const game = store.getState().game;

    await userEvent.click(screen.getByTestId('end-game'));
    await userEvent.click(screen.getByTestId('end-game-cancel'));

    expect(store.getState().game).toBe(game);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('mark-done')).toBeVisible();
  });

  it('keeps the end-game action out of the primary action area', async () => {
    renderGame();
    await screen.findByTestId('current-player');
    await click(pl.game.dare);

    const actions = screen.getByTestId('turn-actions');
    const endGame = screen.getByTestId('end-game');

    expect(actions).not.toContainElement(endGame);
    expect(
      endGame.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
