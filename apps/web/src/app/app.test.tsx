import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { pl } from '../i18n/pl.js';
import { createQueryClient } from '../shared/api/query-client.js';
import { cardsFixture, catalogFixture, deckFixture, FREE_EDITION_SLUG } from '../test/fixtures.js';
import { createTestStore, stubApi } from '../test/render-app.js';
import type { GameStore } from '../features/truth-or-dare/game-store.js';
import { App } from './app.js';

const DECK = `/api/editions/${FREE_EDITION_SLUG}/deck`;
const SETUP_ROUTE = `/setup/${FREE_EDITION_SLUG}`;

function renderAppAt(route: string, store: GameStore = createTestStore()) {
  window.history.pushState({}, '', route);
  render(<App store={store} queryClient={createQueryClient()} />);
  return store;
}

function storeWithGame() {
  const store = createTestStore();
  store.getState().start({ players: ['Ola', 'Kuba'], cards: cardsFixture, penaltyMode: 'none' });
  return store;
}

const confirmAge = () => userEvent.click(screen.getByRole('button', { name: pl.ageGate.confirm }));

describe('App', () => {
  let fetchStub: ReturnType<typeof stubApi>;

  beforeEach(() => {
    fetchStub = stubApi({
      '/api/catalog': { body: catalogFixture },
      [DECK]: { body: deckFixture },
    });
  });

  describe('age gate', () => {
    it.each(['/', '/game', SETUP_ROUTE, '/install', '/no-such-page'])(
      'keeps %s behind the gate',
      (route) => {
        renderAppAt(route, storeWithGame());

        expect(screen.getByRole('heading', { level: 1, name: pl.ageGate.title })).toBeVisible();
        expect(screen.queryByTestId('current-player')).not.toBeInTheDocument();
        expect(screen.queryByTestId('player-name-input')).not.toBeInTheDocument();
        expect(screen.queryByTestId('install-steps')).not.toBeInTheDocument();
      },
    );

    it('requests nothing from the api until the age is confirmed', () => {
      renderAppAt(SETUP_ROUTE);

      expect(fetchStub).not.toHaveBeenCalled();
    });

    it('opens the deep-linked game after confirming', async () => {
      renderAppAt('/game', storeWithGame());

      await confirmAge();

      expect(await screen.findByTestId('current-player')).toHaveTextContent('Ola');
    });

    it('opens the deep-linked setup after confirming', async () => {
      renderAppAt(SETUP_ROUTE);

      await confirmAge();

      expect(screen.getByRole('heading', { level: 1, name: pl.setup.title })).toBeVisible();
      expect(fetchStub.mock.calls.map(([path]) => path)).toContain(DECK);
    });

    it('stays closed on a deep link after declining', async () => {
      renderAppAt('/game', storeWithGame());

      await userEvent.click(screen.getByRole('button', { name: pl.ageGate.decline }));

      expect(screen.getByRole('heading', { level: 1, name: pl.ageGate.declined })).toBeVisible();
      expect(screen.queryByTestId('current-player')).not.toBeInTheDocument();
    });
  });
});
