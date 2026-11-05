import type { CatalogEdition, CatalogResponse, DeckResponse } from '@tod/contracts';
import { expect, test as base, type Page } from '@playwright/test';
import { EDITION_SLUG, confirmAge } from './helpers/app.js';
import { startMockOrigin, type MockOrigin } from './helpers/mock-origin.js';
import { waitForServiceWorkerControl } from './helpers/service-worker.js';

const PAID_SLUG = 'platna';
const CATALOG_PATH = '/api/catalog';
const FREE_DECK = `/api/editions/${EDITION_SLUG}/deck`;
const PAID_DECK = `/api/editions/${PAID_SLUG}/deck`;
const DECK_CACHE_PREFIX = 'tod-free-decks';

function edition(slug: string, tier: CatalogEdition['tier']): CatalogEdition {
  return {
    slug,
    name: slug,
    tier,
    locked: tier === 'paid',
    intensity: 1,
    ageRating: 18,
    platforms: ['web'],
    locale: 'pl',
  };
}

function catalogWith(tier: CatalogEdition['tier']): CatalogResponse {
  return {
    games: [
      {
        slug: 'truth-or-dare',
        name: 'Prawda czy wyzwanie',
        description: 'Opis',
        engine: 'card_deck',
        editions: [edition(EDITION_SLUG, tier), edition(PAID_SLUG, 'paid')],
      },
    ],
  };
}

function deckOf(editionSlug: string): DeckResponse {
  return {
    editionSlug,
    cards: [
      { id: 'truth', kind: 'truth', template: '{player}?', penaltyShots: null },
      { id: 'dare', kind: 'dare', template: '{player}!', penaltyShots: null },
    ],
  };
}

/** Any version of the deck cache counts: the guarantee must not depend on the current name. */
function cachedDeckPaths(page: Page): Promise<string[]> {
  return page.evaluate(async (prefix) => {
    const names = (await caches.keys()).filter((name) => name.startsWith(prefix));
    const entries = await Promise.all(names.map(async (name) => (await caches.open(name)).keys()));
    return entries.flat().map((request) => new URL(request.url).pathname);
  }, DECK_CACHE_PREFIX);
}

/** A request from the page, so it goes through the worker's routes. */
function fetchThroughWorker(page: Page, path: string): Promise<{ status: number; body: unknown }> {
  return page.evaluate(async (url) => {
    const response = await fetch(url);
    return { status: response.status, body: (await response.json()) as unknown };
  }, path);
}

async function removeFromDeckCache(page: Page, path: string): Promise<void> {
  await page.evaluate(
    async ({ prefix, url }) => {
      const names = (await caches.keys()).filter((name) => name.startsWith(prefix));
      await Promise.all(names.map(async (name) => (await caches.open(name)).delete(url)));
    },
    { prefix: DECK_CACHE_PREFIX, url: path },
  );
}

const test = base.extend<{ origin: MockOrigin }>({
  origin: async ({ baseURL: _baseURL }, use) => {
    const origin = await startMockOrigin();
    origin.api.set(CATALOG_PATH, { body: catalogWith('free') });
    origin.api.set(FREE_DECK, { body: deckOf(EDITION_SLUG) });
    await use(origin);
    await origin.close();
  },
});

/** First visit: the worker warmed its caches once it controls the page. */
async function openWithWorker(page: Page, origin: MockOrigin): Promise<void> {
  await page.goto(origin.url);
  await confirmAge(page);
  await waitForServiceWorkerControl(page);
  await expect.poll(() => cachedDeckPaths(page)).toEqual([FREE_DECK]);
}

test.describe('offline cache against a real service worker', () => {
  test('a 200 for a paid edition does not land in the free deck cache', async ({
    page,
    origin,
  }) => {
    await openWithWorker(page, origin);
    origin.api.set(PAID_DECK, { body: deckOf(PAID_SLUG) });

    const paid = await fetchThroughWorker(page, PAID_DECK);
    expect(paid.status).toBe(200);
    expect(origin.apiRequests).toContain(PAID_DECK);

    // Positive control: the same pipeline does store a free deck, requested after the paid one.
    await removeFromDeckCache(page, FREE_DECK);
    await fetchThroughWorker(page, FREE_DECK);
    await expect.poll(() => cachedDeckPaths(page)).toContain(FREE_DECK);

    expect(await cachedDeckPaths(page)).not.toContain(PAID_DECK);
  });

  test('a 403 is passed on and not stored', async ({ page, origin }) => {
    await openWithWorker(page, origin);
    origin.api.set(PAID_DECK, { status: 403, body: {} });

    expect((await fetchThroughWorker(page, PAID_DECK)).status).toBe(403);

    expect(await cachedDeckPaths(page)).toEqual([FREE_DECK]);
  });

  test('a catalog refresh removes a deck that stopped being free', async ({ page, origin }) => {
    await openWithWorker(page, origin);
    origin.api.set(CATALOG_PATH, { body: catalogWith('paid') });

    await fetchThroughWorker(page, CATALOG_PATH);

    await expect.poll(() => cachedDeckPaths(page)).toEqual([]);
  });

  for (const status of [403, 404]) {
    test(`a ${status} for a cached deck removes it`, async ({ page, origin }) => {
      await openWithWorker(page, origin);
      origin.api.set(FREE_DECK, { status, body: {} });

      await fetchThroughWorker(page, FREE_DECK);

      await expect.poll(() => cachedDeckPaths(page)).toEqual([]);
    });
  }

  test('a 200 that breaks the contract does not overwrite good data', async ({ page, origin }) => {
    await openWithWorker(page, origin);
    origin.api.set(CATALOG_PATH, { body: { games: 'nope' } });
    origin.api.set(FREE_DECK, { body: { cards: 'nope' } });

    // The first request serves the cache and revalidates, the second shows what that left behind.
    for (const path of [CATALOG_PATH, CATALOG_PATH, FREE_DECK, FREE_DECK]) {
      await fetchThroughWorker(page, path);
    }

    expect((await fetchThroughWorker(page, CATALOG_PATH)).body).toEqual(catalogWith('free'));
    expect((await fetchThroughWorker(page, FREE_DECK)).body).toEqual(deckOf(EDITION_SLUG));
  });

  test('activation removes caches of earlier releases, and only those', async ({
    page,
    origin,
  }) => {
    origin.api.set('/api/blank', { body: {} });
    // A page of this origin that never registers the worker, so the old caches exist first.
    await page.goto(`${origin.url}/api/blank`);
    await page.evaluate(async () => {
      await Promise.all(
        ['tod-catalog', 'tod-free-decks', 'someone-else'].map((name) => caches.open(name)),
      );
    });

    await openWithWorker(page, origin);

    await expect.poll(() => page.evaluate(() => caches.has('tod-free-decks'))).toBe(false);
    const names = await page.evaluate(() => caches.keys());
    expect(names).not.toContain('tod-catalog');
    expect(names).toContain('someone-else');
    expect(names.some((name) => name.startsWith('workbox-precache'))).toBe(true);
  });
});
