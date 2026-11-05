import { createDeck, type Card, type Deck } from '../../core/deck.js';
import { MissingCardKindError } from '../../core/errors.js';
import { createPlayerQueue, type PlayerError, type PlayerQueue } from '../../core/player-queue.js';
import type { Random } from '../../core/random.js';
import { err, ok, type Result } from '../../core/result.js';

export type PenaltyMode = 'shots' | 'none';

export type TruthOrDareKind = 'truth' | 'dare';

export interface TruthOrDareConfig {
  readonly players: readonly string[];
  readonly cards: readonly Card[];
  readonly penaltyMode: PenaltyMode;
}

/** A drawn card with placeholders already resolved, so restoring a game keeps the same text. */
export interface ResolvedCard {
  readonly id: string;
  readonly kind: TruthOrDareKind;
  readonly text: string;
  readonly penaltyShots: number | null;
}

/** Penalty for the last failed card only. Shots are never accumulated per player. */
export interface Penalty {
  readonly player: string;
  readonly shots: number;
}

interface SharedState {
  readonly penaltyMode: PenaltyMode;
  readonly queue: PlayerQueue;
  readonly deck: Deck;
}

export interface AwaitingTurnState extends SharedState {
  readonly phase: 'awaitingTurn';
  readonly currentPlayer: string | null;
  readonly currentCard: null;
  readonly penalty: Penalty | null;
}

export interface ChoosingState extends SharedState {
  readonly phase: 'choosing';
  readonly currentPlayer: string;
  readonly currentCard: null;
  readonly penalty: null;
}

export interface CardDrawnState extends SharedState {
  readonly phase: 'cardDrawn';
  readonly currentPlayer: string;
  readonly currentCard: ResolvedCard;
  readonly penalty: null;
}

/** JSON-serializable: the whole game position lives here, `Random` stays outside. */
export type TruthOrDareState = AwaitingTurnState | ChoosingState | CardDrawnState;

export type TruthOrDarePhase = TruthOrDareState['phase'];

export type TruthOrDareSetupError = PlayerError | MissingCardKindError;

export function setupTruthOrDare(
  config: TruthOrDareConfig,
  random: Random,
): Result<TruthOrDareState, TruthOrDareSetupError> {
  const queue = createPlayerQueue(config.players);
  if (!queue.ok) {
    return queue;
  }
  const missingKind = (['truth', 'dare'] as const).find(
    (kind) => !config.cards.some((card) => card.kind === kind),
  );
  if (missingKind !== undefined) {
    return err(new MissingCardKindError(missingKind));
  }
  return ok({
    phase: 'awaitingTurn',
    penaltyMode: config.penaltyMode,
    queue: queue.value,
    deck: createDeck(config.cards, random),
    currentPlayer: null,
    currentCard: null,
    penalty: null,
  });
}
