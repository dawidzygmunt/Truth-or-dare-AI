import { describe, expect, it } from 'vitest';
import {
  ENGINE_VERSION,
  createCryptoRandom,
  createTruthOrDareReducer,
  selectCurrentCard,
  selectCurrentPlayer,
  selectPenalty,
  setupTruthOrDare,
  type Card,
  type TruthOrDareState,
} from './index.js';

describe('game-engine', () => {
  it('exposes its version', () => {
    expect(ENGINE_VERSION).toBe('0.0.0');
  });
});

describe('public API', () => {
  it('plays a turn with the production random', () => {
    const cards: Card[] = [
      { id: 't', kind: 'truth', template: '{player} pyta {randomPlayer}', penaltyShots: 2 },
      { id: 'd', kind: 'dare', template: 'wyzwanie' },
    ];
    const random = createCryptoRandom();
    const reduce = createTruthOrDareReducer(random);
    const apply = (state: TruthOrDareState, type: 'nextTurn' | 'chooseTruth' | 'fail') => {
      const result = reduce(state, { type });
      if (!result.ok) {
        throw result.error;
      }
      return result.value;
    };
    const setup = setupTruthOrDare(
      { players: ['Ola', 'Kuba'], cards, penaltyMode: 'shots' },
      random,
    );
    if (!setup.ok) {
      throw setup.error;
    }

    const turn = apply(setup.value, 'nextTurn');
    const drawn = apply(turn, 'chooseTruth');
    const failed = apply(drawn, 'fail');

    expect(selectCurrentPlayer(turn)).toBe('Ola');
    expect(selectCurrentCard(drawn)?.text).toBe('Ola pyta Kuba');
    expect(selectPenalty(failed)).toEqual({ player: 'Ola', shots: 2 });
  });

  it('reports domain errors with a stable code', () => {
    const setup = setupTruthOrDare(
      { players: ['Ola'], cards: [], penaltyMode: 'none' },
      createCryptoRandom(),
    );

    expect(!setup.ok && setup.error.code).toBe('too_few_players');
  });
});
