import { neighboursOf } from './player-queue.js';
import { pickOne, type Random } from './random.js';

export interface TemplateContext {
  readonly players: readonly string[];
  /** Whose turn it is. */
  readonly player: string;
}

const PLACEHOLDER = /\{(?:player|randomPlayer|playerLeft|playerRight)\}/g;

/**
 * Resolves placeholders in a single pass, so a name that looks like a placeholder stays literal.
 * Requires at least one other player, which `createPlayerQueue` guarantees.
 */
export function resolveTemplate(
  template: string,
  { players, player }: TemplateContext,
  random: Random,
): string {
  const { left, right } = neighboursOf(players, player);
  let randomPlayer: string | undefined;

  return template.replace(PLACEHOLDER, (placeholder) => {
    switch (placeholder) {
      case '{player}':
        return player;
      case '{playerLeft}':
        return left;
      case '{playerRight}':
        return right;
      default:
        randomPlayer ??= pickOne(
          players.filter((other) => other !== player),
          random,
        );
        return randomPlayer;
    }
  });
}
