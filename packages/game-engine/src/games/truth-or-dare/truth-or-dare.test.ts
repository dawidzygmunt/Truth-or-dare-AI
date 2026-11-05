import { describe, expect, it } from 'vitest';
import type { Card } from '../../core/deck.js';
import {
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
          { id: 't', kind: 'truth', template: '{player}>{randomPlayer}>{playerLeft}>{playerRight}' },
          { id: 'd', kind: 'dare', template: 'dare' },
        ],
      }),
      'nextTurn',
      'chooseTruth',
    );

    expect(selectCurrentCard(state)?.text).toBe('Ola>Kuba>Kuba>Kuba');
  });
});
