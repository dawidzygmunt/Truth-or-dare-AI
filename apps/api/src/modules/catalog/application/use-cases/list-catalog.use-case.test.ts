import { beforeEach, describe, expect, it } from 'vitest';
import { aCard, aGame, anEdition } from '../../../../../test/support/catalog-fixtures.js';
import { InMemoryEditionRepository } from '../../../../../test/support/in-memory-edition.repository.js';
import { ListCatalog } from './list-catalog.use-case.js';

describe('ListCatalog', () => {
  let repository: InMemoryEditionRepository;
  let listCatalog: ListCatalog;

  beforeEach(() => {
    repository = new InMemoryEditionRepository();
    listCatalog = new ListCatalog(repository);
  });

  it('returns an empty catalog when there are no games', async () => {
    await expect(listCatalog.execute()).resolves.toStrictEqual({ games: [] });
  });

  it('returns games with editions in the DTO shape only', async () => {
    repository.addGame(
      aGame({
        slug: 'truth-or-dare',
        name: 'Prawda czy wyzwanie',
        description: 'Opis',
        editions: [
          anEdition({
            slug: 'klasyczna',
            name: 'Klasyczna',
            tier: 'free',
            intensity: 2,
            ageRating: 18,
            platforms: ['web', 'android'],
            locale: 'pl',
          }),
        ],
      }),
    );

    await expect(listCatalog.execute()).resolves.toStrictEqual({
      games: [
        {
          slug: 'truth-or-dare',
          name: 'Prawda czy wyzwanie',
          description: 'Opis',
          engine: 'card_deck',
          editions: [
            {
              slug: 'klasyczna',
              name: 'Klasyczna',
              tier: 'free',
              locked: false,
              intensity: 2,
              ageRating: 18,
              platforms: ['web', 'android'],
              locale: 'pl',
            },
          ],
        },
      ],
    });
  });

  it('marks paid editions as locked', async () => {
    repository.addGame(aGame({ editions: [anEdition({ slug: 'paid', tier: 'paid' })] }));

    const { games } = await listCatalog.execute();

    expect(games[0]?.editions[0]).toMatchObject({ slug: 'paid', locked: true });
  });

  it('omits unpublished editions', async () => {
    repository.addGame(
      aGame({
        editions: [anEdition({ slug: 'live' }), anEdition({ slug: 'draft', isPublished: false })],
      }),
    );

    const { games } = await listCatalog.execute();

    expect(games[0]?.editions.map((edition) => edition.slug)).toEqual(['live']);
  });

  it('omits games without a published edition', async () => {
    repository.addGame(aGame({ editions: [anEdition({ isPublished: false })] }));

    await expect(listCatalog.execute()).resolves.toStrictEqual({ games: [] });
  });

  it('never touches cards', async () => {
    const edition = anEdition({ tier: 'paid' });
    repository.addGame(aGame({ editions: [edition] }));
    repository.addCards(edition, [aCard({ template: 'secret paid card' })]);

    const catalog = await listCatalog.execute();

    expect(repository.cardLookups).toEqual([]);
    expect(JSON.stringify(catalog)).not.toContain('secret paid card');
  });
});
