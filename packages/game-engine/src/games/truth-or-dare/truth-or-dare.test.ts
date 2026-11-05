import { describe, expect, it } from 'vitest';
import type { Card } from '../../core/deck.js';
import {
  ActionNotAllowedError,
  DuplicatePlayerNameError,
  EmptyPlayerNameError,
  MissingCardKindError,
  TooFewPlayersError,
} from '../../core/errors.js';
import { createSeededRandom } from '../../core/random.js';
import {
  createTruthOrDareReducer,
  type TruthOrDareAction,
  type TruthOrDareReducer,
} from './reducer.js';
import {
  selectCurrentCard,
  selectCurrentPlayer,
  selectPenalty,
  selectPenaltyMode,
  selectPhase,
  selectPlayers,
} from './selectors.js';
import { setupTruthOrDare, type TruthOrDareConfig, type TruthOrDareState } from './state.js';

const CARDS: readonly Card[] = [
  { id: 't1', kind: 'truth', template: '{player}: prawda 1' },
  { id: 't2', kind: 'truth', template: '{player}: prawda 2', penaltyShots: 2 },
  { id: 'd1', kind: 'dare', template: '{player}: wyzwanie 1', penaltyShots: null },
  { id: 'd2', kind: 'dare', template: '{player}: wyzwanie 2', penaltyShots: 3 },
];

const CONFIG: TruthOrDareConfig = {
  players: ['Ola', 'Kuba', 'Ania'],
  cards: CARDS,
  penaltyMode: 'shots',
};

function setup(config: Partial<TruthOrDareConfig> = {}, seed = 1): TruthOrDareState {
  const result = setupTruthOrDare({ ...CONFIG, ...config }, createSeededRandom(seed));
  if (!result.ok) {
    throw result.error;
  }
  return result.value;
}

function setupError(config: Partial<TruthOrDareConfig>): Error {
  const result = setupTruthOrDare({ ...CONFIG, ...config }, createSeededRandom(1));
  if (result.ok) {
    throw new Error('expected setup to fail');
  }
  return result.error;
}

function reducer(seed = 2): TruthOrDareReducer {
  return createTruthOrDareReducer(createSeededRandom(seed));
}

function play(
  reduce: TruthOrDareReducer,
  start: TruthOrDareState,
  ...actions: TruthOrDareAction['type'][]
): TruthOrDareState {
  return actions.reduce((state, type) => {
    const result = reduce(state, { type });
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }, start);
}

function cardsWithPenalty(penaltyShots: Card['penaltyShots']): Card[] {
  return [
    { id: 't', kind: 'truth', template: 'prawda', penaltyShots },
    { id: 'd', kind: 'dare', template: 'wyzwanie', penaltyShots },
  ];
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function restore(state: TruthOrDareState): TruthOrDareState {
  return JSON.parse(JSON.stringify(state)) as TruthOrDareState;
}

function truthCards(count: number): Card[] {
  const truths = Array.from({ length: count }, (_, i) => ({
    id: `t${i}`,
    kind: 'truth' as const,
    template: `{player} i {randomPlayer}: prawda ${i}`,
  }));
  return [...truths, { id: 'd', kind: 'dare', template: 'wyzwanie' }];
}

describe('setupTruthOrDare', () => {
  it('starts waiting for the first turn', () => {
    const state = setup();

    expect(selectPhase(state)).toBe('awaitingTurn');
    expect(selectCurrentPlayer(state)).toBeNull();
    expect(selectCurrentCard(state)).toBeNull();
    expect(selectPenalty(state)).toBeNull();
  });

  it('exposes trimmed players and the penalty mode', () => {
    const state = setup({ players: [' Ola ', 'Kuba'], penaltyMode: 'none' });

    expect(selectPlayers(state)).toEqual(['Ola', 'Kuba']);
    expect(selectPenaltyMode(state)).toBe('none');
  });

  it('rejects invalid players', () => {
    expect(setupError({ players: ['Ola'] })).toBeInstanceOf(TooFewPlayersError);
    expect(setupError({ players: ['Ola', ' '] })).toBeInstanceOf(EmptyPlayerNameError);
    expect(setupError({ players: ['Ola', 'OLA'] })).toBeInstanceOf(DuplicatePlayerNameError);
  });

  it('rejects a deck without truths', () => {
    const error = setupError({ cards: CARDS.filter((card) => card.kind !== 'truth') });

    expect(error).toBeInstanceOf(MissingCardKindError);
    expect(error).toMatchObject({ kind: 'truth' });
  });

  it('rejects a deck without dares', () => {
    const error = setupError({ cards: CARDS.filter((card) => card.kind !== 'dare') });

    expect(error).toBeInstanceOf(MissingCardKindError);
    expect(error).toMatchObject({ kind: 'dare' });
  });
});

describe('truth or dare flow', () => {
  it('nextTurn starts the turn of the first player', () => {
    const state = play(reducer(), setup(), 'nextTurn');

    expect(selectPhase(state)).toBe('choosing');
    expect(selectCurrentPlayer(state)).toBe('Ola');
    expect(selectCurrentCard(state)).toBeNull();
  });

  it('chooseTruth draws a truth with a resolved template', () => {
    const state = play(reducer(), setup(), 'nextTurn', 'chooseTruth');

    expect(selectPhase(state)).toBe('cardDrawn');
    expect(selectCurrentCard(state)).toMatchObject({ kind: 'truth' });
    expect(selectCurrentCard(state)?.text).toMatch(/^Ola: prawda \d$/);
  });

  it('chooseDare draws a dare with a resolved template', () => {
    const state = play(reducer(), setup(), 'nextTurn', 'chooseDare');

    expect(selectPhase(state)).toBe('cardDrawn');
    expect(selectCurrentCard(state)).toMatchObject({ kind: 'dare' });
    expect(selectCurrentCard(state)?.text).toMatch(/^Ola: wyzwanie \d$/);
  });

  it('complete ends the turn without a penalty', () => {
    const state = play(reducer(), setup(), 'nextTurn', 'chooseTruth', 'complete');

    expect(selectPhase(state)).toBe('awaitingTurn');
    expect(selectCurrentCard(state)).toBeNull();
    expect(selectPenalty(state)).toBeNull();
  });

  it('rotates players in the order added and wraps after the last one', () => {
    const reduce = reducer();
    let state = setup();
    const players: (string | null)[] = [];

    for (let turn = 0; turn < 7; turn++) {
      state = play(reduce, state, 'nextTurn');
      players.push(selectCurrentPlayer(state));
      state = play(reduce, state, 'chooseDare', 'complete');
    }

    expect(players).toEqual(['Ola', 'Kuba', 'Ania', 'Ola', 'Kuba', 'Ania', 'Ola']);
  });

  it('draws all cards of a kind before repeating one', () => {
    const reduce = reducer();
    let state = setup();
    const ids: (string | undefined)[] = [];

    for (let turn = 0; turn < 2; turn++) {
      state = play(reduce, state, 'nextTurn', 'chooseTruth');
      ids.push(selectCurrentCard(state)?.id);
      state = play(reduce, state, 'complete');
    }

    expect([...ids].sort()).toEqual(['t1', 't2']);
  });

  it('keeps going after a kind is exhausted', () => {
    const reduce = reducer();
    let state = setup();

    for (let turn = 0; turn < 9; turn++) {
      state = play(reduce, state, 'nextTurn', 'chooseTruth', 'complete');
    }

    expect(selectPhase(state)).toBe('awaitingTurn');
  });

  it('ignores cards of kinds that do not belong to this game', () => {
    const reduce = reducer();
    let state = setup({
      cards: [
        ...CARDS,
        { id: 's1', kind: 'statement', template: 'stwierdzenie' },
        { id: 'c1', kind: 'challenge', template: 'wyzwanie beer pong' },
      ],
    });

    for (let turn = 0; turn < 8; turn++) {
      state = play(reduce, state, 'nextTurn', turn % 2 === 0 ? 'chooseTruth' : 'chooseDare');
      expect(['t1', 't2', 'd1', 'd2']).toContain(selectCurrentCard(state)?.id);
      state = play(reduce, state, 'complete');
    }
  });

  it('resolves player placeholders against the game players', () => {
    const state = play(
      reducer(),
      setup({
        players: ['Ola', 'Kuba'],
        cards: [
          {
            id: 't',
            kind: 'truth',
            template: '{player}>{randomPlayer}>{playerLeft}>{playerRight}',
          },
          { id: 'd', kind: 'dare', template: 'dare' },
        ],
      }),
      'nextTurn',
      'chooseTruth',
    );

    expect(selectCurrentCard(state)?.text).toBe('Ola>Kuba>Kuba>Kuba');
  });
});

describe('fail', () => {
  it.each([
    [2, 2],
    [5, 5],
    [null, 1],
    [undefined, 1],
  ])('in shots mode turns a penaltyShots of %s into a penalty of %s', (penaltyShots, shots) => {
    const start = setup({ cards: cardsWithPenalty(penaltyShots), penaltyMode: 'shots' });

    const state = play(reducer(), start, 'nextTurn', 'chooseDare', 'fail');

    expect(selectPenalty(state)).toEqual({ player: 'Ola', shots });
    expect(selectPhase(state)).toBe('awaitingTurn');
    expect(selectCurrentCard(state)).toBeNull();
  });

  it('applies the penalty to the current player, not the first one', () => {
    const start = setup({ cards: cardsWithPenalty(2), penaltyMode: 'shots' });

    const state = play(
      reducer(),
      start,
      'nextTurn',
      'chooseDare',
      'complete',
      'nextTurn',
      'chooseDare',
      'fail',
    );

    expect(selectPenalty(state)).toEqual({ player: 'Kuba', shots: 2 });
  });

  it('in none mode sets no penalty and just ends the turn', () => {
    const start = setup({ cards: cardsWithPenalty(2), penaltyMode: 'none' });

    const state = play(reducer(), start, 'nextTurn', 'chooseDare', 'fail');

    expect(selectPenalty(state)).toBeNull();
    expect(selectPhase(state)).toBe('awaitingTurn');
  });

  it('nextTurn clears the penalty', () => {
    const start = setup({ cards: cardsWithPenalty(2), penaltyMode: 'shots' });

    const state = play(reducer(), start, 'nextTurn', 'chooseDare', 'fail', 'nextTurn');

    expect(selectPenalty(state)).toBeNull();
  });

  it('never sums shots: a player failing again gets the penalty of the last card only', () => {
    const reduce = reducer();
    const start = setup({
      players: ['Ola', 'Kuba'],
      cards: cardsWithPenalty(3),
      penaltyMode: 'shots',
    });
    const turnOfBoth = ['nextTurn', 'chooseDare', 'fail'] as const;

    const state = play(reduce, start, ...turnOfBoth, ...turnOfBoth, ...turnOfBoth);

    expect(selectPenalty(state)).toEqual({ player: 'Ola', shots: 3 });
  });

  it('keeps no per-player tally anywhere in state', () => {
    const start = setup({ cards: cardsWithPenalty(3), penaltyMode: 'shots' });

    const afterFails = play(
      reducer(),
      start,
      'nextTurn',
      'chooseDare',
      'fail',
      'nextTurn',
      'chooseTruth',
      'fail',
      'nextTurn',
    );

    expect(Object.keys(afterFails).sort()).toEqual(Object.keys(start).sort());
    expect(afterFails.queue).toEqual({ players: start.queue.players, nextIndex: 0 });
    expect(selectPenalty(afterFails)).toBeNull();
  });
});

describe('disallowed actions', () => {
  const awaitingTurn: TruthOrDareAction['type'][] = [];
  const choosing: TruthOrDareAction['type'][] = ['nextTurn'];
  const cardDrawn: TruthOrDareAction['type'][] = ['nextTurn', 'chooseTruth'];
  const afterComplete: TruthOrDareAction['type'][] = [...cardDrawn, 'complete'];
  const afterFail: TruthOrDareAction['type'][] = [...cardDrawn, 'fail'];

  it.each<[string, TruthOrDareAction['type'][], TruthOrDareAction['type']]>([
    ['before the first turn', awaitingTurn, 'chooseTruth'],
    ['before the first turn', awaitingTurn, 'chooseDare'],
    ['before the first turn', awaitingTurn, 'complete'],
    ['before the first turn', awaitingTurn, 'fail'],
    ['while choosing', choosing, 'nextTurn'],
    ['while choosing', choosing, 'complete'],
    ['while choosing', choosing, 'fail'],
    ['with a card drawn', cardDrawn, 'nextTurn'],
    ['with a card drawn', cardDrawn, 'chooseTruth'],
    ['with a card drawn', cardDrawn, 'chooseDare'],
    ['after complete', afterComplete, 'complete'],
    ['after complete', afterComplete, 'fail'],
    ['after complete', afterComplete, 'chooseDare'],
    ['after fail', afterFail, 'fail'],
    ['after fail', afterFail, 'complete'],
  ])('%s: %j then %s returns a domain error', (_label, path, type) => {
    const reduce = reducer();
    const state = deepFreeze(play(reduce, setup({ cards: cardsWithPenalty(2) }), ...path));
    const snapshot = structuredClone(state);

    const result = reduce(state, { type });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBeInstanceOf(ActionNotAllowedError);
    expect(!result.ok && result.error).toMatchObject({ action: type, phase: state.phase });
    expect(state).toEqual(snapshot);
  });
});

describe('allowed actions', () => {
  it('do not mutate the previous state', () => {
    const reduce = reducer();
    let state = deepFreeze(setup());

    for (const type of ['nextTurn', 'chooseTruth', 'fail', 'nextTurn', 'chooseDare'] as const) {
      state = deepFreeze(play(reduce, state, type));
    }

    expect(selectPhase(state)).toBe('cardDrawn');
  });
});

describe('a deck missing a kind, as in a tampered persisted state', () => {
  it('returns a domain error from choose instead of throwing', () => {
    const reduce = reducer();
    const state = play(reduce, setup(), 'nextTurn');
    const tampered: TruthOrDareState = {
      ...state,
      deck: { ...state.deck, truth: { cards: [], nextIndex: 0 } },
    };

    const result = reduce(tampered, { type: 'chooseTruth' });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBeInstanceOf(MissingCardKindError);
  });
});

describe('serialization', () => {
  const fullTurn: TruthOrDareAction['type'][] = ['nextTurn', 'chooseTruth', 'fail'];

  it('survives a JSON round trip unchanged in every phase', () => {
    const reduce = reducer();
    let state = setup({ cards: truthCards(2) });
    expect(restore(state)).toStrictEqual(state);

    for (const type of [...fullTurn, ...fullTurn, ...fullTurn, 'nextTurn'] as const) {
      state = play(reduce, state, type);
      expect(restore(state)).toStrictEqual(state);
    }
  });

  it('survives a round trip of cards given with an explicit undefined penalty', () => {
    const state = setup({ cards: cardsWithPenalty(undefined) });

    expect(restore(state)).toStrictEqual(state);
  });

  it('a restored game plays exactly like the original from any point', () => {
    const script: TruthOrDareAction['type'][] = Array.from(
      { length: 12 },
      (_, turn) =>
        [
          ['nextTurn', 'chooseTruth', 'fail'],
          ['nextTurn', 'chooseDare', 'complete'],
        ][turn % 2] as TruthOrDareAction['type'][],
    ).flat();
    const start = setup({ cards: truthCards(3) });

    for (let cut = 0; cut <= script.length; cut++) {
      const atCut = play(reducer(5), start, ...script.slice(0, cut));
      const rest = script.slice(cut);

      const original = play(reducer(9), atCut, ...rest);
      const restored = play(reducer(9), restore(atCut), ...rest);

      expect(restored).toStrictEqual(original);
    }
  });

  it('keeps the deck position: the rest of a cycle does not depend on the Random used', () => {
    const count = 10;
    const cards = truthCards(count);
    const drawRest = (start: TruthOrDareState, seed: number) => {
      const reduce = reducer(seed);
      let state = start;
      const ids: (string | undefined)[] = [];
      for (let turn = 4; turn < count; turn++) {
        state = play(reduce, state, 'nextTurn', 'chooseTruth');
        ids.push(selectCurrentCard(state)?.id);
        state = play(reduce, state, 'complete');
      }
      return ids;
    };

    const reduce = reducer();
    let state = setup({ cards });
    const drawnBefore: (string | undefined)[] = [];
    for (let turn = 0; turn < 4; turn++) {
      state = play(reduce, state, 'nextTurn', 'chooseTruth');
      drawnBefore.push(selectCurrentCard(state)?.id);
      state = play(reduce, state, 'complete');
    }

    const rest = drawRest(restore(state), 11);

    expect(rest).toEqual(drawRest(state, 22));
    expect(new Set([...drawnBefore, ...rest]).size).toBe(count);
  });

  it('keeps the current player and the resolved card text', () => {
    const state = play(reducer(), setup({ cards: truthCards(1) }), 'nextTurn', 'chooseTruth');

    const restored = restore(state);

    expect(selectCurrentPlayer(restored)).toBe('Ola');
    expect(selectCurrentCard(restored)?.text).toBe(selectCurrentCard(state)?.text);
  });

  it('a card restored in the middle of a turn can still be failed', () => {
    const start = setup({ cards: cardsWithPenalty(2), penaltyMode: 'shots' });
    const state = play(reducer(), start, 'nextTurn', 'chooseDare');

    const failed = play(reducer(99), restore(state), 'fail');

    expect(selectPenalty(failed)).toEqual({ player: 'Ola', shots: 2 });
  });
});
