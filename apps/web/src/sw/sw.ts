/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
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
  catalogCachePlugin,
  deckCachePlugin,
  FREE_DECKS_CACHE,
  isDeckPath,
  warmOfflineCaches,
} from './offline-cache-policy.js';

declare const self: ServiceWorkerGlobalScope & {
  readonly __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
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
  new StaleWhileRevalidate({
    cacheName: CATALOG_CACHE,
    plugins: [catalogCachePlugin(self.caches)],
  }),
);

registerRoute(
  ({ sameOrigin, url }) => sameOrigin && isDeckPath(url.pathname),
  new StaleWhileRevalidate({
    cacheName: FREE_DECKS_CACHE,
    plugins: [deckCachePlugin(self.caches)],
  }),
);
