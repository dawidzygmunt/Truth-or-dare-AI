import type { QueryClient } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import type { GameStore } from '../features/truth-or-dare/game-store.js';
import { AgeGate } from './age-gate.js';
import { AppRoutes } from './app-routes.js';
import { ErrorBoundary } from './error-boundary.js';
import { Providers } from './providers.js';

interface AppProps {
  readonly store: GameStore;
  readonly queryClient: QueryClient;
}

export function App({ store, queryClient }: AppProps) {
  return (
    <ErrorBoundary
      onRestart={() => {
        store.getState().reset();
      }}
    >
      <Providers store={store} queryClient={queryClient}>
        <BrowserRouter>
          <AgeGate>
            <AppRoutes />
          </AgeGate>
        </BrowserRouter>
      </Providers>
    </ErrorBoundary>
  );
}
