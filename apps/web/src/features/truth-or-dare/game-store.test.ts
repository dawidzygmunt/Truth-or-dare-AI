import { createSeededRandom, type PenaltyMode, type Random } from '@tod/game-engine';
import { describe, expect, it } from 'vitest';
import { cardsFixture } from '../../test/fixtures.js';
import { createBrokenStorage, createMemoryStorage } from '../../test/memory-storage.js';
import { createSnapshot, SNAPSHOT_VERSION } from './game-snapshot.js';
import { createGameStore, type GameStorage } from './game-store.js';

const flush = () => new Promise((resolve) => setTimeout(resolve));

function startedStore(
  penaltyMode: PenaltyMode = 'none',
  storage: GameStorage = createMemoryStorage(),
  random: Random = createSeededRandom(1),
) {
  const store = createGameStore({ random, storage });
  const code = store
    .getState()
    .start({ players: ['Ola', 'Kuba', 'Ania'], cards: cardsFixture, penaltyMode });
  expect(code).toBeNull();
  return store;
}

describe('game store', () => {
  describe('start', () => {
    it('opens the turn of the first player', () => {
      const { game, error } = startedStore().getState();

      expect(game?.phase).toBe('choosing');
      expect(game?.currentPlayer).toBe('Ola');
      expect(error).toBeNull();
    });

    it.each([
      [['Ola'], 'too_few_players'],
      [['Ola', ' '], 'empty_player_name'],
      [['Ola', 'OLA'], 'duplicate_player_name'],
    ])('returns the engine error for players %j', (players, code) => {
      const store = createGameStore({
        random: createSeededRandom(1),
        storage: createMemoryStorage(),
      });

      expect(store.getState().start({ players, cards: cardsFixture, penaltyMode: 'none' })).toBe(
        code,
      );
      expect(store.getState().game).toBeNull();
    });

    it('returns the engine error for a deck without dares', () => {
      const store = createGameStore({
        random: createSeededRandom(1),
        storage: createMemoryStorage(),
      });
      const cards = cardsFixture.filter((card) => card.kind === 'truth');

      expect(store.getState().start({ players: ['Ola', 'Kuba'], cards, penaltyMode: 'none' })).toBe(
        'missing_card_kind',
      );
    });

    it('does not persist a failed start', async () => {
      const storage = createMemoryStorage();
      const store = createGameStore({ random: createSeededRandom(1), storage });

      store.getState().start({ players: [], cards: cardsFixture, penaltyMode: 'none' });
      await flush();

      expect(storage.saves).toBe(0);
    });
  });

  describe('turn flow', () => {
    it('draws a card of the chosen kind', () => {
      const store = startedStore();

      store.getState().dispatch({ type: 'chooseDare' });

      const { game } = store.getState();
      expect(game?.phase).toBe('cardDrawn');
      expect(game?.currentCard?.kind).toBe('dare');
      expect(game?.currentCard?.text).toContain('Ola');
    });

    it('moves straight to the next player after completing', () => {
      const store = startedStore('shots');
      store.getState().dispatch({ type: 'chooseTruth' });

      store.getState().dispatch({ type: 'complete' });

      const { game } = store.getState();
      expect(game?.phase).toBe('choosing');
      expect(game?.currentPlayer).toBe('Kuba');
    });

    it('moves straight to the next player after failing in none mode', () => {
      const store = startedStore('none');
      store.getState().dispatch({ type: 'chooseTruth' });

      store.getState().dispatch({ type: 'fail' });

      const { game } = store.getState();
      expect(game?.phase).toBe('choosing');
      expect(game?.currentPlayer).toBe('Kuba');
      expect(game?.penalty).toBeNull();
    });

    it('stops on the penalty after failing in shots mode, until the next turn', () => {
      const store = startedStore('shots');
      store.getState().dispatch({ type: 'chooseTruth' });

      store.getState().dispatch({ type: 'fail' });

      const failed = store.getState().game;
      expect(failed?.phase).toBe('awaitingTurn');
      expect(failed?.penalty?.player).toBe('Ola');
      expect(failed?.penalty?.shots).toBeGreaterThan(0);

      store.getState().dispatch({ type: 'nextTurn' });

      const next = store.getState().game;
      expect(next?.currentPlayer).toBe('Kuba');
      expect(next?.penalty).toBeNull();
    });

    it('wraps around after the last player', () => {
      const store = startedStore();
      for (const _player of ['Ola', 'Kuba', 'Ania']) {
        store.getState().dispatch({ type: 'chooseTruth' });
        store.getState().dispatch({ type: 'complete' });
      }

      expect(store.getState().game?.currentPlayer).toBe('Ola');
    });
  });

  describe('rejected actions', () => {
    it('keeps the state and exposes the stable error code', () => {
      const store = startedStore();
      const before = store.getState().game;

      store.getState().dispatch({ type: 'complete' });

      expect(store.getState().game).toBe(before);
      expect(store.getState().error).toBe('action_not_allowed');
    });

    it('clears the error on the next accepted action', () => {
      const store = startedStore();
      store.getState().dispatch({ type: 'complete' });

      store.getState().dispatch({ type: 'chooseTruth' });

      expect(store.getState().error).toBeNull();
    });

    it('does nothing without a game', () => {
      const store = createGameStore({
        random: createSeededRandom(1),
        storage: createMemoryStorage(),
      });

      store.getState().dispatch({ type: 'chooseTruth' });

      expect(store.getState().game).toBeNull();
      expect(store.getState().error).toBeNull();
    });

    it('does not persist a rejected action', async () => {
      const storage = createMemoryStorage();
      const store = startedStore('none', storage);
      await flush();
      const saves = storage.saves;

      store.getState().dispatch({ type: 'complete' });
      await flush();

      expect(storage.saves).toBe(saves);
    });
  });

  it('calls the reducer exactly once per action', () => {
    let draws = 0;
    const seeded = createSeededRandom(1);
    const counting: Random = {
      nextInt(max) {
        draws += 1;
        return seeded.nextInt(max);
      },
    };
    const store = createGameStore({ random: counting, storage: createMemoryStorage() });
    store.getState().start({
      players: ['Ola', 'Kuba'],
      cards: [
        { id: 'truth', kind: 'truth', template: '{randomPlayer}', penaltyShots: null },
        { id: 'dare', kind: 'dare', template: '{randomPlayer}', penaltyShots: null },
      ],
      penaltyMode: 'none',
    });
    const afterStart = draws;

    store.getState().dispatch({ type: 'chooseTruth' });

    expect(draws - afterStart).toBe(1);
  });

  describe('persistence', () => {
    it('saves a versioned snapshot after every accepted action', async () => {
      const storage = createMemoryStorage();
      const store = startedStore('none', storage);
      await flush();
      expect(storage.stored).toMatchObject({ version: SNAPSHOT_VERSION });
      const saves = storage.saves;

      store.getState().dispatch({ type: 'chooseTruth' });
      await flush();

      expect(storage.saves).toBe(saves + 1);
      expect(storage.stored).toEqual(createSnapshot(store.getState().game ?? fail('no game')));
    });

    it('restores the game with its deck position and card text', async () => {
      const storage = createMemoryStorage();
      const first = startedStore('shots', storage);
      first.getState().dispatch({ type: 'chooseDare' });
      await flush();

      const restored = createGameStore({ random: createSeededRandom(99), storage });
      await restored.getState().hydrate();

      expect(restored.getState().hydrated).toBe(true);
      expect(restored.getState().game).toStrictEqual(first.getState().game);
    });

    it('continues a restored game', async () => {
      const storage = createMemoryStorage();
      const first = startedStore('none', storage);
      first.getState().dispatch({ type: 'chooseDare' });
      await flush();

      const restored = createGameStore({ random: createSeededRandom(99), storage });
      await restored.getState().hydrate();
      restored.getState().dispatch({ type: 'complete' });

      expect(restored.getState().game?.currentPlayer).toBe('Kuba');
    });

    it('finishes hydration with no game when nothing is stored', async () => {
      const store = createGameStore({
        random: createSeededRandom(1),
        storage: createMemoryStorage(),
      });
      expect(store.getState().hydrated).toBe(false);

      await store.getState().hydrate();

      expect(store.getState().hydrated).toBe(true);
      expect(store.getState().game).toBeNull();
    });

    it.each([
      ['an old version', { version: SNAPSHOT_VERSION - 1, game: {} }],
      ['damaged data', { version: SNAPSHOT_VERSION, game: { phase: 'choosing' } }],
      ['garbage', 'garbage'],
    ])('falls back to a fresh start on %s and removes it', async (_label, stored) => {
      const storage = createMemoryStorage(stored);
      const store = createGameStore({ random: createSeededRandom(1), storage });

      await store.getState().hydrate();

      expect(store.getState().hydrated).toBe(true);
      expect(store.getState().game).toBeNull();
      expect(storage.stored).toBeUndefined();
    });

    it('does not overwrite a game started before hydration finished', async () => {
      const storage = createMemoryStorage();
      const older = startedStore('none', storage);
      older.getState().dispatch({ type: 'chooseTruth' });
      await flush();

      const store = createGameStore({ random: createSeededRandom(2), storage });
      const hydration = store.getState().hydrate();
      store
        .getState()
        .start({ players: ['Zosia', 'Janek'], cards: cardsFixture, penaltyMode: 'none' });
      await hydration;

      expect(store.getState().game?.currentPlayer).toBe('Zosia');
    });

    it('forgets the game on reset', async () => {
      const storage = createMemoryStorage();
      const store = startedStore('none', storage);
      await flush();

      store.getState().reset();
      await flush();

      expect(store.getState().game).toBeNull();
      expect(storage.stored).toBeUndefined();
    });
  });

  describe('when storage fails', () => {
    const brokenStore = () =>
      createGameStore({ random: createSeededRandom(1), storage: createBrokenStorage() });

    it('finishes hydration with no game', async () => {
      const store = brokenStore();

      await store.getState().hydrate();

      expect(store.getState().hydrated).toBe(true);
      expect(store.getState().game).toBeNull();
    });

    it('keeps playing in memory', async () => {
      const store = brokenStore();
      await store.getState().hydrate();
      store
        .getState()
        .start({ players: ['Ola', 'Kuba'], cards: cardsFixture, penaltyMode: 'none' });

      store.getState().dispatch({ type: 'chooseTruth' });
      store.getState().dispatch({ type: 'complete' });
      await flush();

      expect(store.getState().game?.currentPlayer).toBe('Kuba');
      store.getState().reset();
      await flush();
      expect(store.getState().game).toBeNull();
    });
  });
});

function fail(message: string): never {
  throw new Error(message);
}
