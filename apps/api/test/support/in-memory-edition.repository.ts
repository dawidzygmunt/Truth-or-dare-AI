import type { EditionRepository } from '../../src/modules/catalog/application/ports/edition-repository.port.js';
import type { Card } from '../../src/modules/catalog/domain/card.js';
import type { Edition } from '../../src/modules/catalog/domain/edition.js';
import type { GameWithEditions } from '../../src/modules/catalog/domain/game.js';

export class InMemoryEditionRepository implements EditionRepository {
  /** Every edition id whose cards were read, so tests can prove a locked deck is never loaded. */
  readonly cardLookups: string[] = [];

  private readonly games: GameWithEditions[] = [];
  private readonly cards = new Map<string, Card[]>();

  addGame(game: GameWithEditions): void {
    this.games.push(game);
  }

  addCards(edition: Edition, cards: Card[]): void {
    this.cards.set(edition.id, cards);
  }

  listPublishedGames(): Promise<GameWithEditions[]> {
    const games = this.games
      .map((game) => ({
        ...game,
        editions: game.editions.filter((edition) => edition.isPublished),
      }))
      .filter((game) => game.editions.length > 0);
    return Promise.resolve(games);
  }

  findPublishedBySlug(slug: string): Promise<Edition | null> {
    const edition = this.games
      .flatMap((game) => game.editions)
      .find((candidate) => candidate.slug === slug && candidate.isPublished);
    return Promise.resolve(edition ?? null);
  }

  findCardsByEditionId(editionId: string): Promise<Card[]> {
    this.cardLookups.push(editionId);
    return Promise.resolve(this.cards.get(editionId) ?? []);
  }
}
