export const ENGINE_VERSION = '0.0.0';

export type { Card, CardKind } from './core/deck.js';
export {
  ActionNotAllowedError,
  DuplicatePlayerNameError,
  EmptyPlayerNameError,
  GameError,
  MissingCardKindError,
  TooFewPlayersError,
} from './core/errors.js';
export type { PlayerError } from './core/player-queue.js';
export { createCryptoRandom, createSeededRandom, type Random } from './core/random.js';
export type { Result } from './core/result.js';
export * from './games/truth-or-dare/index.js';
