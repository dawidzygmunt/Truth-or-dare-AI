import { drawCard } from '../../core/deck.js';
import { MissingCardKindError } from '../../core/errors.js';
import { takeTurn } from '../../core/player-queue.js';
import type { Random } from '../../core/random.js';
import { err, ok, type Result } from '../../core/result.js';
import { resolveTemplate } from '../../core/template.js';
import type { TruthOrDareKind, TruthOrDareState } from './state.js';

const DEFAULT_SHOTS = 1;

export type TruthOrDareAction =
  | { readonly type: 'nextTurn' }
  | { readonly type: 'chooseTruth' }
  | { readonly type: 'chooseDare' }
  | { readonly type: 'complete' }
  | { readonly type: 'fail' };

export type TruthOrDareActionError = MissingCardKindError;

export type TruthOrDareResult = Result<TruthOrDareState, TruthOrDareActionError>;

export type TruthOrDareReducer = (
  state: TruthOrDareState,
  action: TruthOrDareAction,
) => TruthOrDareResult;

function nextTurn(state: TruthOrDareState): TruthOrDareResult {
  if (state.phase !== 'awaitingTurn') {
    return ok(state);
  }
  const { player, queue } = takeTurn(state.queue);
  return ok({
    ...state,
    phase: 'choosing',
    queue,
    currentPlayer: player,
    currentCard: null,
    penalty: null,
  });
}

function choose(
  state: TruthOrDareState,
  kind: TruthOrDareKind,
  random: Random,
): TruthOrDareResult {
  if (state.phase !== 'choosing') {
    return ok(state);
  }
  const drawn = drawCard(state.deck, kind, random);
  if (drawn === null) {
    return err(new MissingCardKindError(kind));
  }
  const { id, template, penaltyShots } = drawn.card;
  const context = { players: state.queue.players, player: state.currentPlayer };
  return ok({
    ...state,
    phase: 'cardDrawn',
    deck: drawn.deck,
    currentCard: { id, kind, text: resolveTemplate(template, context, random), penaltyShots },
  });
}

function complete(state: TruthOrDareState): TruthOrDareResult {
  if (state.phase !== 'cardDrawn') {
    return ok(state);
  }
  return ok({ ...state, phase: 'awaitingTurn', currentCard: null });
}

function fail(state: TruthOrDareState): TruthOrDareResult {
  if (state.phase !== 'cardDrawn') {
    return ok(state);
  }
  const penalty =
    state.penaltyMode === 'shots'
      ? { player: state.currentPlayer, shots: state.currentCard.penaltyShots ?? DEFAULT_SHOTS }
      : null;
  return ok({ ...state, phase: 'awaitingTurn', currentCard: null, penalty });
}

/** Creates the reducer. `Random` is bound here because game state must stay JSON-serializable. */
export function createTruthOrDareReducer(random: Random): TruthOrDareReducer {
  return (state, action) => {
    switch (action.type) {
      case 'nextTurn':
        return nextTurn(state);
      case 'chooseTruth':
        return choose(state, 'truth', random);
      case 'chooseDare':
        return choose(state, 'dare', random);
      case 'complete':
        return complete(state);
      case 'fail':
        return fail(state);
    }
  };
}
