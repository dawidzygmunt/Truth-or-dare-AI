import { render } from '@testing-library/react';
import { createSeededRandom, type Random } from '@tod/game-engine';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { AppRoutes } from '../app/app-routes.js';
import { Providers } from '../app/providers.js';
import {
  createGameStore,
  type GameStorage,
  type GameStore,
} from '../features/truth-or-dare/game-store.js';
import { createQueryClient } from '../shared/api/query-client.js';
import { createMemoryStorage } from './memory-storage.js';

export interface StubResponse {
  readonly status?: number;
  readonly body?: unknown;
}

/** Fake network: `fetch` is the only thing replaced, responses go through the real client. */
export function stubApi(routes: Readonly<Record<string, StubResponse | Error>>) {
  const fetchStub = vi.fn<typeof fetch>((input) => {
    const route = routes[input instanceof Request ? input.url : input.toString()];
    if (route === undefined) {
      return Promise.resolve(new Response(null, { status: 404 }));
    }
    if (route instanceof Error) {
      return Promise.reject(route);
    }
    const { status = 200, body = {} } = route;
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  });
  vi.stubGlobal('fetch', fetchStub);
  return fetchStub;
}

export function createTestStore(
  storage: GameStorage = createMemoryStorage(),
  random: Random = createSeededRandom(1),
): GameStore {
  return createGameStore({ random, storage });
}

interface RenderAppOptions {
  readonly route?: string;
  readonly store?: GameStore;
}

export function renderApp({ route = '/', store = createTestStore() }: RenderAppOptions = {}) {
  const queryClient = createQueryClient();
  // Retries wait for real timers, and the policy has its own unit test.
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  });
  const view = render(
    <Providers store={store} queryClient={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </Providers>,
  );
  return { ...view, store, queryClient };
}
