import {
  createSeededRandom,
  createTruthOrDareReducer,
  setupTruthOrDare,
  type TruthOrDareAction,
  type TruthOrDareState,
} from '@tod/game-engine';
import { describe, expect, it } from 'vitest';
import { cardsFixture } from '../../test/fixtures.js';
import { createSnapshot, readSnapshot, SNAPSHOT_VERSION } from './game-snapshot.js';

function gameAfter(actions: readonly TruthOrDareAction[]): TruthOrDareState {
  const random = createSeededRandom(1);
  const setup = setupTruthOrDare(
    { players: ['Ola', 'Kuba'], cards: cardsFixture, penaltyMode: 'shots' },
    random,
  );
  if (!setup.ok) throw setup.error;
  const reduce = createTruthOrDareReducer(random);
  return actions.reduce((state, action) => {
    const result = reduce(state, action);
    if (!result.ok) throw result.error;
    return result.value;
  }, setup.value);
}

const asStored = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

describe('game snapshot', () => {
  it.each<[string, readonly TruthOrDareAction[]]>([
    ['awaitingTurn', []],
    ['choosing', [{ type: 'nextTurn' }]],
    ['cardDrawn', [{ type: 'nextTurn' }, { type: 'chooseTruth' }]],
    ['penalty', [{ type: 'nextTurn' }, { type: 'chooseDare' }, { type: 'fail' }]],
  ])('round-trips a game in the %s state', (_label, actions) => {
    const game = gameAfter(actions);

    expect(readSnapshot(asStored(createSnapshot(game)))).toStrictEqual(game);
  });

  it('carries a version', () => {
    expect(createSnapshot(gameAfter([])).version).toBe(SNAPSHOT_VERSION);
  });

  it('rejects another version', () => {
    const snapshot = { ...createSnapshot(gameAfter([])), version: SNAPSHOT_VERSION + 1 };

    expect(readSnapshot(snapshot)).toBeNull();
  });

  it.each([[undefined], [null], ['text'], [42], [{}], [{ version: SNAPSHOT_VERSION }]])(
    'rejects unreadable data: %j',
    (stored) => {
      expect(readSnapshot(stored)).toBeNull();
    },
  );

  it('rejects a damaged game', () => {
    const { queue: _queue, ...withoutQueue } = gameAfter([{ type: 'nextTurn' }]);

    expect(readSnapshot({ version: SNAPSHOT_VERSION, game: withoutQueue })).toBeNull();
  });

  it('rejects a card-drawn game without a card', () => {
    const game = { ...gameAfter([{ type: 'nextTurn' }]), phase: 'cardDrawn' };

    expect(readSnapshot({ version: SNAPSHOT_VERSION, game })).toBeNull();
  });

  it('rejects a pile with a broken position', () => {
    const game = gameAfter([]);
    const deck = { ...game.deck, truth: { ...game.deck.truth, nextIndex: -1 } };

    expect(readSnapshot({ version: SNAPSHOT_VERSION, game: { ...game, deck } })).toBeNull();
  });
});
