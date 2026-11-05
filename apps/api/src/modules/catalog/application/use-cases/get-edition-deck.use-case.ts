import type { Card } from '../../domain/card.js';
import { EditionLockedError } from '../../domain/edition-locked.error.js';
import { EditionNotFoundError } from '../../domain/edition-not-found.error.js';
import { isEditionLocked } from '../../domain/edition.js';
import type { EditionRepository } from '../ports/edition-repository.port.js';

export type EditionDeckCard = Pick<Card, 'id' | 'kind' | 'template' | 'penaltyShots'>;

export interface EditionDeck {
  editionSlug: string;
  cards: EditionDeckCard[];
}

export class GetEditionDeck {
  constructor(private readonly editions: EditionRepository) {}

  async execute(slug: string): Promise<EditionDeck> {
    const edition = await this.editions.findPublishedBySlug(slug);
    if (!edition) throw new EditionNotFoundError(slug);
    // Must stay before the card lookup: locked content never leaves the database.
    if (isEditionLocked(edition)) throw new EditionLockedError(slug);

    const cards = await this.editions.findCardsByEditionId(edition.id);

    return {
      editionSlug: edition.slug,
      cards: cards.map(({ id, kind, template, penaltyShots }) => ({
        id,
        kind,
        template,
        penaltyShots,
      })),
    };
  }
}
