/// <reference lib="webworker" />
import { clientsClaim, type WorkboxPlugin } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import {
  CATALOG_CACHE,
  CATALOG_PATH,
  FREE_DECKS_CACHE,
  isDeckPath,
  isFreeDeck,
  warmOfflineCaches,
} from './offline-cache-policy.js';

declare const self: ServiceWorkerGlobalScope & {
  readonly __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};

const onlySuccessful: WorkboxPlugin = {
  cacheWillUpdate: ({ response }) => Promise.resolve(response.status === 200 ? response : null),
};

/** Paid decks pass through this route and are never stored, even with a valid entitlement. */
const onlyFreeEditions: WorkboxPlugin = {
  cacheWillUpdate: async ({ request, response }) =>
    (await isFreeDeck(new URL(request.url).pathname, self.caches)) ? response : null,
};

void self.skipWaiting();
clientsClaim();

self.addEventListener('install', (event) => {
  event.waitUntil(warmOfflineCaches(self.caches));
});

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/^\/api\//] }),
);

registerRoute(
  ({ sameOrigin, url }) => sameOrigin && url.pathname === CATALOG_PATH,
  new StaleWhileRevalidate({ cacheName: CATALOG_CACHE, plugins: [onlySuccessful] }),
);

registerRoute(
  ({ sameOrigin, url }) => sameOrigin && isDeckPath(url.pathname),
  new StaleWhileRevalidate({
    cacheName: FREE_DECKS_CACHE,
    plugins: [onlySuccessful, onlyFreeEditions],
  }),
);
