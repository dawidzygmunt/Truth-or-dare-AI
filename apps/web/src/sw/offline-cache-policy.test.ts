import { describe, expect, it, vi } from 'vitest';
import {
  CATALOG_CACHE,
  CATALOG_PATH,
  catalogCachePlugin,
  deckCachePlugin,
  FREE_DECKS_CACHE,
  freeDeckPaths,
  isDeckPath,
  isFreeDeck,
  warmOfflineCaches,
  type CacheOpener,
} from './offline-cache-policy.js';
import {
  catalogFixture,
  deckFixture,
  FREE_EDITION_SLUG,
  PAID_EDITION_SLUG,
} from '../test/fixtures.js';

const FREE_DECK = `/api/editions/${FREE_EDITION_SLUG}/deck`;
const PAID_DECK = `/api/editions/${PAID_EDITION_SLUG}/deck`;

function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>();
  const opener: CacheOpener = {
    open(name) {
      const store = stores.get(name) ?? new Map<string, Response>();
      stores.set(name, store);
      return Promise.resolve({
        match: (path) => Promise.resolve(store.get(path)),
        put: (path, response) => {
          store.set(path, response);
          return Promise.resolve();
        },
      });
    },
  };
  return { opener, keys: (name: string) => [...(stores.get(name)?.keys() ?? [])] };
}

function fakeNetwork(routes: Readonly<Record<string, Response | Error>>) {
  return vi.fn<typeof fetch>((input) => {
    const route = typeof input === 'string' ? routes[input] : undefined;
    if (route === undefined) return Promise.resolve(new Response(null, { status: 404 }));
    return route instanceof Error ? Promise.reject(route) : Promise.resolve(route.clone());
  });
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('freeDeckPaths', () => {
  it('lists only free editions', () => {
    expect(freeDeckPaths(catalogFixture)).toEqual([FREE_DECK]);
  });

  it('escapes slugs', () => {
    const [game] = catalogFixture.games;
    const [edition] = game?.editions ?? [];
    const catalog = {
      games: [{ ...game, editions: [{ ...edition, slug: 'a/b' }] }],
    };

    expect(freeDeckPaths(catalog)).toEqual(['/api/editions/a%2Fb/deck']);
  });

  it.each([[undefined], [null], ['text'], [{ games: 'nope' }]])(
    'treats an unreadable catalog as having no free decks: %j',
    (catalog) => {
      expect(freeDeckPaths(catalog)).toEqual([]);
    },
  );
});

describe('isDeckPath', () => {
  it('matches only the deck endpoint', () => {
    expect(isDeckPath(FREE_DECK)).toBe(true);
    expect(isDeckPath('/api/editions/x')).toBe(false);
    expect(isDeckPath('/api/editions/x/deck/extra')).toBe(false);
    expect(isDeckPath(CATALOG_PATH)).toBe(false);
  });
});

describe('isFreeDeck', () => {
  it('checks the edition tier in the cached catalog', async () => {
    const { opener } = fakeCaches();
    const catalogCache = await opener.open(CATALOG_CACHE);
    await catalogCache.put(CATALOG_PATH, json(catalogFixture));

    expect(await isFreeDeck(FREE_DECK, opener)).toBe(true);
    expect(await isFreeDeck(PAID_DECK, opener)).toBe(false);
    expect(await isFreeDeck('/api/editions/unknown/deck', opener)).toBe(false);
  });

  it('refuses when the catalog is not cached', async () => {
    expect(await isFreeDeck(FREE_DECK, fakeCaches().opener)).toBe(false);
  });

  it('refuses when the cached catalog is unreadable', async () => {
    const { opener } = fakeCaches();
    const catalogCache = await opener.open(CATALOG_CACHE);
    await catalogCache.put(CATALOG_PATH, new Response('<html>'));

    expect(await isFreeDeck(FREE_DECK, opener)).toBe(false);
  });

  it('can be asked repeatedly about the same cached response', async () => {
    const { opener } = fakeCaches();
    const catalogCache = await opener.open(CATALOG_CACHE);
    await catalogCache.put(CATALOG_PATH, json(catalogFixture));

    await isFreeDeck(FREE_DECK, opener);

    expect(await isFreeDeck(FREE_DECK, opener)).toBe(true);
  });
});

describe('deckCachePlugin', () => {
  const paidDeck = { editionSlug: PAID_EDITION_SLUG, cards: deckFixture.cards };
  const requestFor = (path: string) => new Request(`http://localhost${path}`);

  async function withCatalog(response: Response = json(catalogFixture)) {
    const { opener } = fakeCaches();
    const catalogCache = await opener.open(CATALOG_CACHE);
    await catalogCache.put(CATALOG_PATH, response);
    return deckCachePlugin(opener).cacheWillUpdate;
  }

  it('stores a 200 for a free edition and leaves its body readable', async () => {
    const cacheWillUpdate = await withCatalog();

    const stored = await cacheWillUpdate({
      request: requestFor(FREE_DECK),
      response: json(deckFixture),
    });

    expect(await stored?.json()).toEqual(deckFixture);
  });

  it('does not store a 200 for a paid edition', async () => {
    const cacheWillUpdate = await withCatalog();

    expect(
      await cacheWillUpdate({ request: requestFor(PAID_DECK), response: json(paidDeck) }),
    ).toBeNull();
  });

  it('does not store a 200 for an edition missing from the catalog', async () => {
    const cacheWillUpdate = await withCatalog();
    const path = '/api/editions/unknown/deck';

    expect(
      await cacheWillUpdate({ request: requestFor(path), response: json(deckFixture) }),
    ).toBeNull();
  });

  it('writes nothing without a cached catalog', async () => {
    const { cacheWillUpdate } = deckCachePlugin(fakeCaches().opener);

    expect(
      await cacheWillUpdate({ request: requestFor(FREE_DECK), response: json(deckFixture) }),
    ).toBeNull();
  });

  it.each([
    ['is not JSON', new Response('<html>')],
    ['breaks the contract', json({ games: 'nope' })],
  ])('writes nothing when the cached catalog %s', async (_label, catalog) => {
    const cacheWillUpdate = await withCatalog(catalog);

    expect(
      await cacheWillUpdate({ request: requestFor(FREE_DECK), response: json(deckFixture) }),
    ).toBeNull();
  });

  it.each([401, 403, 404, 500])('does not store a %i', async (status) => {
    const cacheWillUpdate = await withCatalog();

    expect(
      await cacheWillUpdate({
        request: requestFor(FREE_DECK),
        response: json(deckFixture, status),
      }),
    ).toBeNull();
  });

  it.each([
    ['breaks the contract', json({ cards: 'nope' })],
    ['is not JSON', new Response('<html>')],
  ])('does not overwrite good data with a 200 that %s', async (_label, response) => {
    const cacheWillUpdate = await withCatalog();

    expect(await cacheWillUpdate({ request: requestFor(FREE_DECK), response })).toBeNull();
  });
});

describe('catalogCachePlugin', () => {
  const { cacheWillUpdate } = catalogCachePlugin(fakeCaches().opener);

  it('stores a valid catalog and leaves its body readable', async () => {
    const stored = await cacheWillUpdate({ response: json(catalogFixture) });

    expect(await stored?.json()).toEqual(catalogFixture);
  });

  it.each([403, 404, 500])('does not store a %i', async (status) => {
    expect(await cacheWillUpdate({ response: json(catalogFixture, status) })).toBeNull();
  });

  it.each([
    ['breaks the contract', json({ games: 'nope' })],
    ['is not JSON', new Response('<html>')],
  ])('does not overwrite good data with a 200 that %s', async (_label, response) => {
    expect(await cacheWillUpdate({ response })).toBeNull();
  });
});

describe('warmOfflineCaches', () => {
  it('stores the catalog and the decks of free editions', async () => {
    const { opener, keys } = fakeCaches();
    const network = fakeNetwork({
      [CATALOG_PATH]: json(catalogFixture),
      [FREE_DECK]: json(deckFixture),
    });

    await warmOfflineCaches(opener, network);

    expect(keys(CATALOG_CACHE)).toEqual([CATALOG_PATH]);
    expect(keys(FREE_DECKS_CACHE)).toEqual([FREE_DECK]);
  });

  it('never requests a paid deck', async () => {
    const network = fakeNetwork({
      [CATALOG_PATH]: json(catalogFixture),
      [FREE_DECK]: json(deckFixture),
    });

    await warmOfflineCaches(fakeCaches().opener, network);

    expect(network.mock.calls.map(([path]) => path)).not.toContain(PAID_DECK);
  });

  it('does not store a failed deck response', async () => {
    const { opener, keys } = fakeCaches();
    const network = fakeNetwork({
      [CATALOG_PATH]: json(catalogFixture),
      [FREE_DECK]: json({}, 403),
    });

    await warmOfflineCaches(opener, network);

    expect(keys(FREE_DECKS_CACHE)).toEqual([]);
  });

  it('does not store a 200 deck that breaks the contract', async () => {
    const { opener, keys } = fakeCaches();
    const network = fakeNetwork({
      [CATALOG_PATH]: json(catalogFixture),
      [FREE_DECK]: json({ cards: 'nope' }),
    });

    await warmOfflineCaches(opener, network);

    expect(keys(FREE_DECKS_CACHE)).toEqual([]);
  });

  it('stores nothing when the catalog fails', async () => {
    const { opener, keys } = fakeCaches();

    await warmOfflineCaches(opener, fakeNetwork({ [CATALOG_PATH]: json({}, 500) }));

    expect(keys(CATALOG_CACHE)).toEqual([]);
  });

  it('stores nothing when the catalog breaks the contract', async () => {
    const { opener, keys } = fakeCaches();

    await warmOfflineCaches(opener, fakeNetwork({ [CATALOG_PATH]: json({ games: 'nope' }) }));

    expect(keys(CATALOG_CACHE)).toEqual([]);
  });

  it('resolves when the api is unreachable, so installation can finish', async () => {
    const { opener } = fakeCaches();

    await expect(
      warmOfflineCaches(opener, fakeNetwork({ [CATALOG_PATH]: new TypeError('offline') })),
    ).resolves.toBeUndefined();
  });
});
