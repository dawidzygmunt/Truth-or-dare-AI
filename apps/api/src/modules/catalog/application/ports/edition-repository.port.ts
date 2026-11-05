import type { Card } from '../../domain/card.js';
import type { Edition } from '../../domain/edition.js';
import type { GameWithEditions } from '../../domain/game.js';

export const EDITION_REPOSITORY = Symbol('EDITION_REPOSITORY');

export interface EditionRepository {
  /** Games that have at least one published edition, with published editions only. No cards. */
  listPublishedGames(): Promise<GameWithEditions[]>;
  findPublishedBySlug(slug: string): Promise<Edition | null>;
  /** The only way to reach card content. Callers must check access first. */
  findCardsByEditionId(editionId: string): Promise<Card[]>;
}
