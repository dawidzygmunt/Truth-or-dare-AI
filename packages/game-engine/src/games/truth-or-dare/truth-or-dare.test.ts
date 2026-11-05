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
