import type { CatalogResponse, DeckResponse } from '@tod/contracts';
import { describe, expect, it, vi } from 'vitest';
import { fetchCatalog, fetchDeck, REQUEST_TIMEOUT_MS } from './api-client.js';
import { ApiError } from './api-error.js';

const catalog: CatalogResponse = {
  games: [
    {
      slug: 'truth-or-dare',
      name: 'Prawda czy wyzwanie',
      description: 'Opis',
      engine: 'card_deck',
      editions: [],
    },
  ],
};

const deck: DeckResponse = {
  editionSlug: 'klasyczna',
  cards: [{ id: 'c1', kind: 'truth', template: '{player}?', penaltyShots: null }],
};

const respondWith = (status: number, body: unknown = {}) => {
  const fetchStub = vi.fn<typeof fetch>(() =>
    Promise.resolve(new Response(JSON.stringify(body), { status })),
  );
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
};

const apiErrorCode = async (request: Promise<unknown>) => {
  const error: unknown = await request.catch((reason: unknown) => reason);
  return error instanceof ApiError ? error.code : error;
};

describe('fetchCatalog', () => {
  it('returns the catalog from the same-origin api path', async () => {
    const fetchStub = respondWith(200, catalog);

    expect(await fetchCatalog()).toEqual(catalog);
    expect(fetchStub.mock.calls[0]?.[0]).toBe('/api/catalog');
  });

  it('reports a response that does not match the contract', async () => {
    respondWith(200, { games: 'nope' });

    expect(await apiErrorCode(fetchCatalog())).toBe('invalid_response');
  });

  it('reports a body that is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.resolve(new Response('<html>', { status: 200 }))),
    );

    expect(await apiErrorCode(fetchCatalog())).toBe('invalid_response');
  });

  it('reports a server error', async () => {
    respondWith(500);

    expect(await apiErrorCode(fetchCatalog())).toBe('server');
  });

  it('reports a network failure as offline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    expect(await apiErrorCode(fetchCatalog())).toBe('offline');
  });
});

describe('request timeout', () => {
  const timedOut = () => {
    const signal = AbortSignal.abort(new DOMException('timed out', 'TimeoutError'));
    return vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal);
  };

  it('gives every request a time limit', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const fetchStub = respondWith(200, catalog);

    await fetchCatalog();

    expect(timeout).toHaveBeenCalledWith(REQUEST_TIMEOUT_MS);
    expect(fetchStub.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('reports a request that hangs as offline', async () => {
    timedOut();
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>((_input, init) => Promise.reject(init?.signal?.reason as DOMException)),
    );

    expect(await apiErrorCode(fetchCatalog())).toBe('offline');
  });

  it('reports a body that hangs as offline, not as a broken response', async () => {
    timedOut();
    const response = new Response('{}');
    vi.spyOn(response, 'json').mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.resolve(response)),
    );

    expect(await apiErrorCode(fetchCatalog())).toBe('offline');
  });
});

describe('fetchDeck', () => {
  it('returns the deck of an edition', async () => {
    const fetchStub = respondWith(200, deck);

    expect(await fetchDeck('klasyczna')).toEqual(deck);
    expect(fetchStub.mock.calls[0]?.[0]).toBe('/api/editions/klasyczna/deck');
  });

  it('escapes the slug', async () => {
    const fetchStub = respondWith(200, deck);

    await fetchDeck('a/b');

    expect(fetchStub.mock.calls[0]?.[0]).toBe('/api/editions/a%2Fb/deck');
  });

  it.each([401, 403])('treats %i as a locked edition', async (status) => {
    respondWith(status);

    expect(await apiErrorCode(fetchDeck('platna'))).toBe('edition_locked');
  });

  it('reports an unknown edition', async () => {
    respondWith(404);

    expect(await apiErrorCode(fetchDeck('nieznana'))).toBe('not_found');
  });
});
