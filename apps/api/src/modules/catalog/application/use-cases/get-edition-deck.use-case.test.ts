import { beforeEach, describe, expect, it } from 'vitest';
import { aCard, aGame, anEdition } from '../../../../../test/support/catalog-fixtures.js';
import { InMemoryEditionRepository } from '../../../../../test/support/in-memory-edition.repository.js';
import { EditionLockedError } from '../../domain/edition-locked.error.js';
import { EditionNotFoundError } from '../../domain/edition-not-found.error.js';
import { GetEditionDeck } from './get-edition-deck.use-case.js';

describe('GetEditionDeck', () => {
  let repository: InMemoryEditionRepository;
  let getEditionDeck: GetEditionDeck;

  beforeEach(() => {
    repository = new InMemoryEditionRepository();
    getEditionDeck = new GetEditionDeck(repository);
  });

  it('returns the cards of a free edition in the DTO shape only', async () => {
    const edition = anEdition({ slug: 'free-edition', tier: 'free' });
    repository.addGame(aGame({ editions: [edition] }));
    repository.addCards(edition, [
      aCard({
        id: 'card-1',
        kind: 'dare',
        template: '{player}, zaśpiewaj refren.',
        tags: ['music'],
        penaltyShots: 2,
      }),
    ]);

    await expect(getEditionDeck.execute('free-edition')).resolves.toStrictEqual({
      editionSlug: 'free-edition',
      cards: [
        { id: 'card-1', kind: 'dare', template: '{player}, zaśpiewaj refren.', penaltyShots: 2 },
      ],
    });
  });

  it('only returns cards of the requested edition', async () => {
    const wanted = anEdition({ id: 'wanted', slug: 'wanted' });
    const other = anEdition({ id: 'other', slug: 'other' });
    repository.addGame(aGame({ editions: [wanted, other] }));
    repository.addCards(wanted, [aCard({ id: 'wanted-card' })]);
    repository.addCards(other, [aCard({ id: 'other-card' })]);

    const deck = await getEditionDeck.execute('wanted');

    expect(deck.cards.map((card) => card.id)).toEqual(['wanted-card']);
  });

  it('throws EditionNotFoundError for an unknown edition', async () => {
    await expect(getEditionDeck.execute('nope')).rejects.toBeInstanceOf(EditionNotFoundError);
  });

  it('treats an unpublished edition as not found, even a paid one', async () => {
    repository.addGame(
      aGame({
        editions: [
          anEdition({ slug: 'draft', isPublished: false }),
          anEdition({ slug: 'paid-draft', tier: 'paid', isPublished: false }),
        ],
      }),
    );

    await expect(getEditionDeck.execute('draft')).rejects.toBeInstanceOf(EditionNotFoundError);
    await expect(getEditionDeck.execute('paid-draft')).rejects.toBeInstanceOf(EditionNotFoundError);
  });

  it('throws EditionLockedError for a paid edition without ever loading its cards', async () => {
    const edition = anEdition({ slug: 'paid-edition', tier: 'paid' });
    repository.addGame(aGame({ editions: [edition] }));
    repository.addCards(edition, [aCard()]);

    await expect(getEditionDeck.execute('paid-edition')).rejects.toBeInstanceOf(EditionLockedError);
    expect(repository.cardLookups).toEqual([]);
  });
});
