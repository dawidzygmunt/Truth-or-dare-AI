import { createContext, use, useEffect, type ReactNode } from 'react';
import { useStore } from 'zustand';
import type { GameStore, GameStoreState } from './game-store.js';

const GameStoreContext = createContext<GameStore | null>(null);

interface GameStoreProviderProps {
  readonly store: GameStore;
  readonly children: ReactNode;
}

export function GameStoreProvider({ store, children }: GameStoreProviderProps) {
  useEffect(() => {
    void store.getState().hydrate();
  }, [store]);

  return <GameStoreContext value={store}>{children}</GameStoreContext>;
}

export function useGameStore<T>(selector: (state: GameStoreState) => T): T {
  const store = use(GameStoreContext);
  if (store === null) {
    throw new Error('useGameStore must be used inside GameStoreProvider');
  }
  return useStore(store, selector);
}
