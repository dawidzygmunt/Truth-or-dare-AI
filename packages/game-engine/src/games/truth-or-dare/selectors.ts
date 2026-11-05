import type {
  PenaltyMode,
  Penalty,
  ResolvedCard,
  TruthOrDarePhase,
  TruthOrDareState,
} from './state.js';

export function selectPhase(state: TruthOrDareState): TruthOrDarePhase {
  return state.phase;
}

export function selectPlayers(state: TruthOrDareState): readonly string[] {
  return state.queue.players;
}

export function selectPenaltyMode(state: TruthOrDareState): PenaltyMode {
  return state.penaltyMode;
}

export function selectCurrentPlayer(state: TruthOrDareState): string | null {
  return state.currentPlayer;
}

export function selectCurrentCard(state: TruthOrDareState): ResolvedCard | null {
  return state.currentCard;
}

export function selectPenalty(state: TruthOrDareState): Penalty | null {
  return state.penalty;
}
