import type { CardKind } from './deck.js';

/** Base of all domain errors. `code` is stable, so the UI can map it to a translated message. */
export abstract class GameError extends Error {
  abstract readonly code: string;
}

export class TooFewPlayersError extends GameError {
  readonly code = 'too_few_players';

  constructor(readonly minimum: number) {
    super(`At least ${minimum} players are required`);
  }
}

export class EmptyPlayerNameError extends GameError {
  readonly code = 'empty_player_name';

  constructor() {
    super('Player name must not be empty');
  }
}

export class DuplicatePlayerNameError extends GameError {
  readonly code = 'duplicate_player_name';

  constructor(readonly playerName: string) {
    super(`Player name "${playerName}" is already taken`);
  }
}

export class MissingCardKindError extends GameError {
  readonly code = 'missing_card_kind';

  constructor(readonly kind: CardKind) {
    super(`The deck has no cards of kind "${kind}"`);
  }
}

/** The action is not one of the moves available in the current phase of the game. */
export class ActionNotAllowedError extends GameError {
  readonly code = 'action_not_allowed';

  constructor(
    readonly action: string,
    readonly phase: string,
  ) {
    super(`Action "${action}" is not allowed in phase "${phase}"`);
  }
}
