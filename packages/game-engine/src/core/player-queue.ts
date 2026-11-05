import { DuplicatePlayerNameError, EmptyPlayerNameError, TooFewPlayersError } from './errors.js';
import { err, ok, type Result } from './result.js';

const MIN_PLAYERS = 2;

export type PlayerError = TooFewPlayersError | EmptyPlayerNameError | DuplicatePlayerNameError;

/** Turn order: `players` in the order added, `nextIndex` points at whose turn comes next. */
export interface PlayerQueue {
  readonly players: readonly string[];
  readonly nextIndex: number;
}

export interface Turn {
  readonly player: string;
  readonly queue: PlayerQueue;
}

export interface Neighbours {
  readonly left: string;
  readonly right: string;
}

export function createPlayerQueue(names: readonly string[]): Result<PlayerQueue, PlayerError> {
  const players = names.map((name) => name.trim());
  if (players.includes('')) {
    return err(new EmptyPlayerNameError());
  }
  if (players.length < MIN_PLAYERS) {
    return err(new TooFewPlayersError(MIN_PLAYERS));
  }
  const seen = new Set<string>();
  for (const player of players) {
    const key = player.toLowerCase();
    if (seen.has(key)) {
      return err(new DuplicatePlayerNameError(player));
    }
    seen.add(key);
  }
  return ok({ players, nextIndex: 0 });
}

/** Reads a list as a circle: index -1 is the last element, index `length` is the first. */
function circularAt<T>(items: readonly T[], index: number): T {
  return items[(index + items.length) % items.length] as T;
}

export function takeTurn(queue: PlayerQueue): Turn {
  const { players, nextIndex } = queue;
  return {
    player: circularAt(players, nextIndex),
    queue: { players, nextIndex: (nextIndex + 1) % players.length },
  };
}

export function neighboursOf(queue: PlayerQueue, player: string): Neighbours {
  const { players } = queue;
  const index = players.indexOf(player);
  return { left: circularAt(players, index - 1), right: circularAt(players, index + 1) };
}
