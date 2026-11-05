import { CatalogResponseSchema } from '@tod/contracts';

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
        if (deckResponse.status === 200) {
          await deckCache.put(path, deckResponse);
        }
      }),
    );
  } catch {
    // Offline or api down during installation.
  }
}
