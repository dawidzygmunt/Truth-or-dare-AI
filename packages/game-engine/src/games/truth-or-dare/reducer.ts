import { drawCard } from '../../core/deck.js';
import { ActionNotAllowedError, MissingCardKindError } from '../../core/errors.js';
import { takeTurn } from '../../core/player-queue.js';
import type { Random } from '../../core/random.js';
import { err, ok, type Result } from '../../core/result.js';
import { resolveTemplate } from '../../core/template.js';
import type {
  AwaitingTurnState,
  CardDrawnState,
  ChoosingState,
  TruthOrDareKind,
  TruthOrDareState,
} from './state.js';

const DEFAULT_SHOTS = 1;

export type TruthOrDareAction =
  | { readonly type: 'nextTurn' }
  | { readonly type: 'chooseTruth' }
  | { readonly type: 'chooseDare' }
  | { readonly type: 'complete' }
  | { readonly type: 'fail' };

export type TruthOrDareActionError = ActionNotAllowedError | MissingCardKindError;

/** On failure there is no new state, so the caller keeps the state it passed in. */
export type TruthOrDareResult = Result<TruthOrDareState, TruthOrDareActionError>;

export type TruthOrDareReducer = (
  state: TruthOrDareState,
  action: TruthOrDareAction,
) => TruthOrDareResult;

function nextTurn(state: AwaitingTurnState): TruthOrDareResult {
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

function choose(state: ChoosingState, kind: TruthOrDareKind, random: Random): TruthOrDareResult {
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

function complete(state: CardDrawnState): TruthOrDareResult {
  return ok({ ...state, phase: 'awaitingTurn', currentCard: null });
}

function fail(state: CardDrawnState): TruthOrDareResult {
  const penalty =
    state.penaltyMode === 'shots'
      ? { player: state.currentPlayer, shots: state.currentCard.penaltyShots ?? DEFAULT_SHOTS }
      : null;
  return ok({ ...state, phase: 'awaitingTurn', currentCard: null, penalty });
}

/** Creates the reducer. `Random` is bound here because game state must stay JSON-serializable. */
export function createTruthOrDareReducer(random: Random): TruthOrDareReducer {
  return (state, action) => {
    switch (state.phase) {
      case 'awaitingTurn':
        if (action.type === 'nextTurn') return nextTurn(state);
        break;
      case 'choosing':
        if (action.type === 'chooseTruth') return choose(state, 'truth', random);
        if (action.type === 'chooseDare') return choose(state, 'dare', random);
        break;
      case 'cardDrawn':
        if (action.type === 'complete') return complete(state);
        if (action.type === 'fail') return fail(state);
        break;
    }
    return err(new ActionNotAllowedError(action.type, state.phase));
  };
}
