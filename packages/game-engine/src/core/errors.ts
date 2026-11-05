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
