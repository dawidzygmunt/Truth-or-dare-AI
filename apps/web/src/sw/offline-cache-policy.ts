import { CatalogResponseSchema, DeckResponseSchema } from '@tod/contracts';
import type { z } from 'zod';

/** Bump to drop everything earlier releases stored: `activate` removes the older caches. */
const CACHE_VERSION = 'v2';

export const CATALOG_PATH = '/api/catalog';
export const CATALOG_CACHE = `tod-catalog-${CACHE_VERSION}`;
export const FREE_DECKS_CACHE = `tod-free-decks-${CACHE_VERSION}`;

/** Also matches the unversioned names of the first release. */
const OWN_CACHE = /^tod-(?:catalog|free-decks)(?:-v\d+)?$/;
const DECK_PATH = /^\/api\/editions\/[^/]+\/deck$/;
/** The api answers these once a deck stopped being free or was unpublished. */
const DECK_GONE_STATUSES: readonly number[] = [403, 404];
const WARM_UP_TIMEOUT_MS = 10_000;
/** Removal goes by path, whatever query or `Vary` header the entry was stored with. */
const ANY_VARIANT = { ignoreSearch: true, ignoreVary: true };

interface OfflineCache {
  match(path: string): Promise<Response | undefined>;
  put(path: string, response: Response): Promise<void>;
  keys(): Promise<readonly Request[]>;
  delete(path: string, options?: CacheQueryOptions): Promise<boolean>;
}

export interface CacheOpener {
  open(name: string): Promise<OfflineCache>;
  keys(): Promise<readonly string[]>;
  delete(name: string): Promise<boolean>;
}

export function isDeckPath(pathname: string): boolean {
  return DECK_PATH.test(pathname);
}

/** Deck paths of free editions. An unreadable catalog yields none, so writes fail closed. */
export function freeDeckPaths(catalog: unknown): string[] {
  const parsed = CatalogResponseSchema.safeParse(catalog);
  if (!parsed.success) {
    return [];
  }
  return parsed.data.games
    .flatMap((game) => game.editions)
    .filter((edition) => edition.tier === 'free')
    .map((edition) => `/api/editions/${encodeURIComponent(edition.slug)}/deck`);
}

/** Decides from the cached catalog; without one the answer is no. */
export async function isFreeDeck(pathname: string, caches: CacheOpener): Promise<boolean> {
  const catalogCache = await caches.open(CATALOG_CACHE);
  const response = await catalogCache.match(CATALOG_PATH);
  const catalog: unknown = await response
    ?.clone()
    .json()
    .catch(() => null);
  return freeDeckPaths(catalog).includes(pathname);
}

/** Whether a response may replace what is cached: only a 200 whose body honours the contract. */
async function isValidResponse(response: Response, schema: z.ZodType): Promise<boolean> {
  if (response.status !== 200) {
    return false;
  }
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null);
  return schema.safeParse(body).success;
}

/** Drops decks the catalog no longer lists as free. An unreadable catalog removes nothing. */
async function removeDecksNotFreeIn(catalog: unknown, caches: CacheOpener): Promise<void> {
  if (!CatalogResponseSchema.safeParse(catalog).success) {
    return;
  }
  const freePaths = new Set(freeDeckPaths(catalog));
  const deckCache = await caches.open(FREE_DECKS_CACHE);
  const entries = await deckCache.keys();
  await Promise.all(
    entries
      .map((entry) => new URL(entry.url).pathname)
      .filter((path) => !freePaths.has(path))
      .map((path) => deckCache.delete(path, ANY_VARIANT)),
  );
}

async function removeDeckIfGone(path: string, status: number, caches: CacheOpener): Promise<void> {
  if (DECK_GONE_STATUSES.includes(status)) {
    const deckCache = await caches.open(FREE_DECKS_CACHE);
    await deckCache.delete(path, ANY_VARIANT);
  }
}

/** Removes caches of earlier releases. Precache and anything else not ours stays. */
export async function removeOutdatedCaches(caches: CacheOpener): Promise<void> {
  const current = [CATALOG_CACHE, FREE_DECKS_CACHE];
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => OWN_CACHE.test(name) && !current.includes(name))
      .map((name) => caches.delete(name)),
  );
}

/** Workbox plugin for the catalog route. */
export function catalogCachePlugin(caches: CacheOpener) {
  return {
    cacheWillUpdate: async ({ response }: { readonly response: Response }) =>
      (await isValidResponse(response, CatalogResponseSchema)) ? response : null,
    cacheDidUpdate: async ({ newResponse }: { readonly newResponse: Response }) => {
      const catalog: unknown = await newResponse.json().catch(() => null);
      await removeDecksNotFreeIn(catalog, caches);
    },
  };
}

/**
 * Workbox plugin for the deck route, which paid decks pass through as well.
 *
 * Guarantee: a deck is stored only as a valid 200 for an edition that the catalog cached in this
 * browser lists as free at the moment of writing. That catalog can be stale, so this is NOT "a paid
 * deck is never stored": a 200 for an edition that became paid after the catalog was cached would
 * be stored. Unreachable today, as the api answers 403 for every paid deck. It has to be solved
 * before Entitlements, see ADR 0006.
 */
export function deckCachePlugin(caches: CacheOpener) {
  return {
    cacheWillUpdate: async ({
      request,
      response,
    }: {
      readonly request: Request;
      readonly response: Response;
    }) =>
      (await isValidResponse(response, DeckResponseSchema)) &&
      (await isFreeDeck(new URL(request.url).pathname, caches))
        ? response
        : null,
    fetchDidSucceed: async ({
      request,
      response,
    }: {
      readonly request: Request;
      readonly response: Response;
    }) => {
      await removeDeckIfGone(new URL(request.url).pathname, response.status, caches);
      return response;
    },
  };
}

/**
 * Runs while the worker installs. The page that registered it is not controlled yet, so its own
 * requests never reach the caches, and "offline after the first load" would not hold otherwise.
 * Failures are ignored: the caches also fill up during normal use.
 */
export async function warmOfflineCaches(
  caches: CacheOpener,
  fetchFromNetwork: typeof fetch = fetch,
): Promise<void> {
  const get = (path: string) =>
    fetchFromNetwork(path, { signal: AbortSignal.timeout(WARM_UP_TIMEOUT_MS) });

  try {
    const catalogResponse = await get(CATALOG_PATH);
    if (catalogResponse.status !== 200) {
      return;
    }
    const catalog: unknown = await catalogResponse.clone().json();
    if (!CatalogResponseSchema.safeParse(catalog).success) {
      return;
    }
    const catalogCache = await caches.open(CATALOG_CACHE);
    await catalogCache.put(CATALOG_PATH, catalogResponse);
    await removeDecksNotFreeIn(catalog, caches);

    const deckCache = await caches.open(FREE_DECKS_CACHE);
    await Promise.all(
      freeDeckPaths(catalog).map(async (path) => {
        const deckResponse = await get(path);
        await removeDeckIfGone(path, deckResponse.status, caches);
        if (await isValidResponse(deckResponse, DeckResponseSchema)) {
          await deckCache.put(path, deckResponse);
        }
      }),
    );
  } catch {
    // Offline or api down during installation.
  }
}
