import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { pl } from '../../i18n/pl.js';
import {
  cardsFixture,
  deckFixture,
  FREE_EDITION_SLUG,
  PAID_EDITION_SLUG,
} from '../../test/fixtures.js';
import { createTestStore, renderApp, stubApi } from '../../test/render-app.js';

const DECK = `/api/editions/${FREE_EDITION_SLUG}/deck`;
const ROUTE = `/setup/${FREE_EDITION_SLUG}`;

const addPlayer = async (name: string) => {
  await userEvent.type(screen.getByLabelText(pl.setup.playerName), name);
  await userEvent.click(screen.getByRole('button', { name: pl.setup.addPlayer }));
};

const startGame = async () => {
  const start = screen.getByRole('button', { name: pl.setup.start });
  await waitFor(() => {
    expect(start).toBeEnabled();
  });
  await userEvent.click(start);
};

describe('SetupScreen', () => {
  it('adds players in order and clears the field', async () => {
    stubApi({ [DECK]: { body: deckFixture } });
    renderApp({ route: ROUTE });

    await addPlayer('Ola');
    await addPlayer('Kuba');

    expect(screen.getAllByTestId('player-item').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Ola'),
      expect.stringContaining('Kuba'),
    ]);
    expect(screen.getByLabelText(pl.setup.playerName)).toHaveValue('');
  });

  it('colours the avatars by position, cycling through the four tones', async () => {
    stubApi({ [DECK]: { body: deckFixture } });
    renderApp({ route: ROUTE });

    for (const name of ['Ola', 'Kuba', 'Marek', 'Zuza', 'Ania']) {
      await addPlayer(name);
    }

    expect(screen.getAllByTestId('player-avatar').map((avatar) => avatar.dataset.tone)).toEqual([
      'pink',
      'cyan',
      'violet',
      'orange',
      'pink',
    ]);
  });

  it('returns focus to the name field, so the keyboard stays open', async () => {
    stubApi({ [DECK]: { body: deckFixture } });
    renderApp({ route: ROUTE });

    await addPlayer('Ola');

    expect(screen.getByLabelText(pl.setup.playerName)).toHaveFocus();
  });

  it('adds a player with the enter key', async () => {
    stubApi({ [DECK]: { body: deckFixture } });
    renderApp({ route: ROUTE });

    await userEvent.type(screen.getByLabelText(pl.setup.playerName), 'Ola{Enter}');

    expect(screen.getAllByTestId('player-item')).toHaveLength(1);
  });

  it('does not add a blank name', async () => {
    stubApi({ [DECK]: { body: deckFixture } });
    renderApp({ route: ROUTE });

    await userEvent.type(screen.getByLabelText(pl.setup.playerName), '   ');

    expect(screen.getByRole('button', { name: pl.setup.addPlayer })).toBeDisabled();
  });

  it('removes a player', async () => {
    stubApi({ [DECK]: { body: deckFixture } });
    renderApp({ route: ROUTE });
    await addPlayer('Ola');
    await addPlayer('Kuba');

    await userEvent.click(screen.getByRole('button', { name: pl.setup.removePlayer('Ola') }));

    expect(screen.getAllByTestId('player-item')).toHaveLength(1);
    expect(screen.queryByText('Ola')).not.toBeInTheDocument();
  });

  it('shows the engine error when there are too few players', async () => {
    stubApi({ [DECK]: { body: deckFixture } });
    renderApp({ route: ROUTE });
    await addPlayer('Ola');

    await startGame();

    expect(screen.getByRole('alert')).toHaveTextContent(pl.gameErrors.too_few_players);
    expect(screen.getByRole('heading', { level: 1, name: pl.setup.title })).toBeVisible();
  });

  it('shows the engine error for a duplicate name and recovers after removing it', async () => {
    stubApi({ [DECK]: { body: deckFixture } });
    const { store } = renderApp({ route: ROUTE });
    await addPlayer('Ola');
    await addPlayer('ola');

    await startGame();
    expect(screen.getByRole('alert')).toHaveTextContent(pl.gameErrors.duplicate_player_name);

    await userEvent.click(screen.getByRole('button', { name: pl.setup.removePlayer('ola') }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await addPlayer('Kuba');
    await startGame();

    expect(store.getState().game?.currentPlayer).toBe('Ola');
  });

  it('starts without penalties by default', () => {
    stubApi({ [DECK]: { body: deckFixture } });
    renderApp({ route: ROUTE });

    expect(screen.getByRole('radio', { name: pl.setup.penaltyNone })).toBeChecked();
    expect(screen.getByRole('radio', { name: pl.setup.penaltyShots })).not.toBeChecked();
  });

  it('starts the game with the chosen penalty mode and opens the game screen', async () => {
    stubApi({ [DECK]: { body: deckFixture } });
    const { store } = renderApp({ route: ROUTE });
    await addPlayer('Ola');
    await addPlayer('Kuba');
    await userEvent.click(screen.getByRole('radio', { name: pl.setup.penaltyShots }));

    await startGame();

    expect(store.getState().game?.penaltyMode).toBe('shots');
    expect(await screen.findByTestId('current-player')).toHaveTextContent('Ola');
  });

  describe('with a game in progress', () => {
    const renderWithGame = async () => {
      stubApi({ [DECK]: { body: deckFixture } });
      const store = createTestStore();
      store
        .getState()
        .start({ players: ['Ola', 'Kuba'], cards: cardsFixture, penaltyMode: 'none' });
      renderApp({ route: ROUTE, store });
      await addPlayer('Zosia');
      await addPlayer('Janek');
      await startGame();
      return store;
    };

    it('asks before replacing it', async () => {
      const store = await renderWithGame();

      expect(store.getState().game?.currentPlayer).toBe('Ola');
      expect(
        screen.getByRole('alertdialog', { name: pl.setup.replaceConfirm.title }),
      ).toBeVisible();
      expect(screen.getByTestId('replace-game-cancel')).toHaveFocus();
    });

    it('replaces it after confirming', async () => {
      const store = await renderWithGame();

      await userEvent.click(screen.getByTestId('replace-game-confirm'));

      expect(store.getState().game?.currentPlayer).toBe('Zosia');
      expect(await screen.findByTestId('current-player')).toHaveTextContent('Zosia');
    });

    it('keeps it and stays in setup after cancelling', async () => {
      const store = await renderWithGame();

      await userEvent.click(screen.getByTestId('replace-game-cancel'));

      expect(store.getState().game?.currentPlayer).toBe('Ola');
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('player-item')).toHaveLength(2);
    });

    it('keeps it when the engine refuses the new setup', async () => {
      stubApi({ [DECK]: { body: deckFixture } });
      const store = createTestStore();
      store
        .getState()
        .start({ players: ['Ola', 'Kuba'], cards: cardsFixture, penaltyMode: 'none' });
      renderApp({ route: ROUTE, store });
      await addPlayer('Zosia');
      await startGame();

      await userEvent.click(screen.getByTestId('replace-game-confirm'));

      expect(screen.getByRole('alert')).toHaveTextContent(pl.gameErrors.too_few_players);
      expect(store.getState().game?.currentPlayer).toBe('Ola');
    });
  });

  it('does not ask when there is no game to replace', async () => {
    stubApi({ [DECK]: { body: deckFixture } });
    renderApp({ route: ROUTE });
    await addPlayer('Ola');
    await addPlayer('Kuba');

    await startGame();

    expect(await screen.findByTestId('current-player')).toHaveTextContent('Ola');
  });

  it('keeps the start button disabled until the deck is loaded', () => {
    stubApi({ [DECK]: { body: deckFixture } });
    renderApp({ route: ROUTE });

    expect(screen.getByRole('button', { name: pl.setup.start })).toBeDisabled();
  });

  it('explains that a paid edition is locked', async () => {
    stubApi({ [`/api/editions/${PAID_EDITION_SLUG}/deck`]: { status: 403 } });
    renderApp({ route: `/setup/${PAID_EDITION_SLUG}` });

    expect(await screen.findByRole('alert')).toHaveTextContent(pl.apiErrors.edition_locked);
    expect(screen.queryByRole('button', { name: pl.common.retry })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: pl.setup.start })).toBeDisabled();
    expect(screen.getByRole('link', { name: pl.common.back })).toHaveAttribute('href', '/');
  });

  it('offers a retry when the deck cannot be downloaded', async () => {
    stubApi({ [DECK]: new TypeError('Failed to fetch') });
    renderApp({ route: ROUTE });

    expect(await screen.findByRole('alert')).toHaveTextContent(pl.apiErrors.offline);

    stubApi({ [DECK]: { body: deckFixture } });
    await userEvent.click(screen.getByRole('button', { name: pl.common.retry }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: pl.setup.start })).toBeEnabled();
    });
  });
});
