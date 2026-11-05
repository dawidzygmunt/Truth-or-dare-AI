import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { GameStoreProvider } from '../features/truth-or-dare/game-store-context.js';
import type { GameStore } from '../features/truth-or-dare/game-store.js';

interface ProvidersProps {
  readonly store: GameStore;
  readonly queryClient: QueryClient;
  readonly children: ReactNode;
}

export function Providers({ store, queryClient, children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <GameStoreProvider store={store}>{children}</GameStoreProvider>
    </QueryClientProvider>
  );
}
