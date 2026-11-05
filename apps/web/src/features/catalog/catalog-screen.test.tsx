import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { pl } from '../../i18n/pl.js';
import {
  catalogFixture,
  cardsFixture,
  FREE_EDITION_SLUG,
  PAID_EDITION_SLUG,
} from '../../test/fixtures.js';
import { createTestStore, renderApp, stubApi } from '../../test/render-app.js';

const CATALOG = '/api/catalog';

describe('CatalogScreen', () => {
  it('shows a loading state, then games and editions from the api', async () => {
    stubApi({ [CATALOG]: { body: catalogFixture } });
    renderApp();

    expect(screen.getByRole('status')).toHaveTextContent(pl.common.loading);
    expect(await screen.findByRole('heading', { level: 2, name: 'Prawda czy wyzwanie' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Klasyczna/ })).toHaveAttribute(
      'href',
      `/setup/${FREE_EDITION_SLUG}`,
    );
  });

  it('shows a paid edition as locked, without a way in', async () => {
    stubApi({ [CATALOG]: { body: catalogFixture } });
    renderApp();

    const edition = await screen.findByTestId(`edition-${PAID_EDITION_SLUG}`);

    expect(within(edition).getByText('Spicy')).toBeVisible();
    expect(within(edition).getByText(pl.catalog.locked)).toBeVisible();
    expect(screen.queryByRole('link', { name: /Spicy/ })).not.toBeInTheDocument();
  });

  it('offers a retry when the catalog cannot be loaded', async () => {
    const fetchStub = stubApi({ [CATALOG]: new TypeError('Failed to fetch') });
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent(pl.apiErrors.offline);

    stubApi({ [CATALOG]: { body: catalogFixture } });
    await userEvent.click(screen.getByRole('button', { name: pl.common.retry }));

    expect(await screen.findByRole('link', { name: /Klasyczna/ })).toBeVisible();
    expect(fetchStub).toHaveBeenCalledOnce();
  });

  it('says so when there is nothing to play', async () => {
    stubApi({ [CATALOG]: { body: { games: [] } } });
    renderApp();

    expect(await screen.findByText(pl.catalog.empty)).toBeVisible();
  });

  it('links to the iOS install instructions', async () => {
    stubApi({ [CATALOG]: { body: catalogFixture } });
    renderApp();

    expect(await screen.findByRole('link', { name: pl.catalog.install })).toHaveAttribute(
      'href',
      '/install',
    );
  });

  it('offers to continue a game in progress', async () => {
    stubApi({ [CATALOG]: { body: catalogFixture } });
    const store = createTestStore();
    store.getState().start({ players: ['Ola', 'Kuba'], cards: cardsFixture, penaltyMode: 'none' });
    renderApp({ store });

    expect(await screen.findByRole('link', { name: pl.catalog.resume })).toHaveAttribute(
      'href',
      '/game',
    );
  });

  it('does not offer to continue without a game', async () => {
    stubApi({ [CATALOG]: { body: catalogFixture } });
    const { store } = renderApp();

    await waitFor(() => {
      expect(store.getState().hydrated).toBe(true);
    });
    expect(screen.queryByRole('link', { name: pl.catalog.resume })).not.toBeInTheDocument();
  });
});
