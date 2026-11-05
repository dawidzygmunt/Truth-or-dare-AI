import {
  createTruthOrDareReducer,
  setupTruthOrDare,
  type Random,
  type TruthOrDareAction,
  type TruthOrDareActionError,
  type TruthOrDareConfig,
  type TruthOrDareSetupError,
  type TruthOrDareState,
} from '@tod/game-engine';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { KeyValueStorage } from '../../shared/storage/key-value-storage.js';
import { createSnapshot, readSnapshot, type GameSnapshot } from './game-snapshot.js';

export type GameStorage = KeyValueStorage<GameSnapshot>;
export type GameActionErrorCode = TruthOrDareActionError['code'];
export type GameSetupErrorCode = TruthOrDareSetupError['code'];

export interface GameStoreState {
  readonly game: TruthOrDareState | null;
  /** Code of the last rejected action. The game itself stays as it was. */
  readonly error: GameActionErrorCode | null;
  /** False until the stored game was looked up, so screens do not act on a missing game too soon. */
  readonly hydrated: boolean;
  /** Replaces any current game. Returns the error code when the engine refuses the setup. */
  start(config: TruthOrDareConfig): GameSetupErrorCode | null;
  dispatch(action: TruthOrDareAction): void;
  hydrate(): Promise<void>;
  reset(): void;
}

export type GameStore = StoreApi<GameStoreState>;

export interface GameStoreDependencies {
  readonly random: Random;
  readonly storage: GameStorage;
}

function ignoreFailure(operation: Promise<void>): void {
  // IndexedDB can be unavailable, for example in private mode. The game then lives in memory.
  operation.catch(() => undefined);
}

export function createGameStore({ random, storage }: GameStoreDependencies): GameStore {
  const reduce = createTruthOrDareReducer(random);

  /** A turn only pauses to show a penalty; otherwise the next player follows right away. */
  const settle = (game: TruthOrDareState): TruthOrDareState => {
    if (game.phase !== 'awaitingTurn' || game.penalty !== null) {
      return game;
    }
    const next = reduce(game, { type: 'nextTurn' });
    return next.ok ? next.value : game;
  };

  return createStore<GameStoreState>((set, get) => {
    const commit = (game: TruthOrDareState) => {
      const settled = settle(game);
      set({ game: settled, error: null });
      ignoreFailure(storage.save(createSnapshot(settled)));
    };

    return {
      game: null,
      error: null,
      hydrated: false,

      start(config) {
        const setup = setupTruthOrDare(config, random);
        if (!setup.ok) {
          return setup.error.code;
        }
        commit(setup.value);
        return null;
      },

      dispatch(action) {
        const { game } = get();
        if (game === null) {
          return;
        }
        const result = reduce(game, action);
        if (result.ok) {
          commit(result.value);
        } else {
          set({ error: result.error.code });
        }
      },

      async hydrate() {
        const stored = await storage.load().catch(() => undefined);
        if (get().game === null && stored !== undefined) {
          const game = readSnapshot(stored);
          if (game === null) {
            ignoreFailure(storage.clear());
          } else {
            set({ game: settle(game) });
          }
        }
        set({ hydrated: true });
      },

      reset() {
        set({ game: null, error: null });
        ignoreFailure(storage.clear());
      },
    };
  });
}
