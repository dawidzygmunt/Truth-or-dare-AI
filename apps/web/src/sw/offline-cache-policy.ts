import { CatalogResponseSchema, DeckResponseSchema } from '@tod/contracts';
import type { z } from 'zod';

export const CATALOG_PATH = '/api/catalog';
export const CATALOG_CACHE = 'tod-catalog';
export const FREE_DECKS_CACHE = 'tod-free-decks';

const DECK_PATH = /^\/api\/editions\/[^/]+\/deck$/;
const WARM_UP_TIMEOUT_MS = 10_000;

interface OfflineCache {
  match(path: string): Promise<Response | undefined>;
  put(path: string, response: Response): Promise<void>;
}

export interface CacheOpener {
  open(name: string): Promise<OfflineCache>;
}

export function isDeckPath(pathname: string): boolean {
  return DECK_PATH.test(pathname);
}

/** Deck paths of free editions. An unreadable catalog yields none: paid cards must never slip in. */
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

/** Workbox plugin for the catalog route. */
export function catalogCachePlugin(_caches: CacheOpener) {
  return {
    cacheWillUpdate: async ({ response }: { readonly response: Response }) =>
      (await isValidResponse(response, CatalogResponseSchema)) ? response : null,
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

    const deckCache = await caches.open(FREE_DECKS_CACHE);
    await Promise.all(
      freeDeckPaths(catalog).map(async (path) => {
        const deckResponse = await get(path);
        if (await isValidResponse(deckResponse, DeckResponseSchema)) {
          await deckCache.put(path, deckResponse);
        }
      }),
    );
  } catch {
    // Offline or api down during installation.
  }
}
