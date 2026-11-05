import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { aCard, aGame, anEdition } from '../../../../test/support/catalog-fixtures.js';
import {
  insertCards,
  insertGame,
  startTestDatabase,
  type TestDatabase,
} from '../../../../test/support/test-database.js';
import { PrismaEditionRepository } from './prisma-edition.repository.js';

const free = anEdition({
  slug: 'free',
  name: 'B free',
  intensity: 2,
  ageRating: 18,
  platforms: ['web', 'android'],
  locale: 'pl',
});
const paid = anEdition({
  slug: 'paid',
  name: 'A paid',
  tier: 'paid',
  productId: 'prod_paid',
  platforms: ['web'],
});
const draft = anEdition({ slug: 'draft', isPublished: false });
const draftOnly = anEdition({ slug: 'draft-only', isPublished: false });

describe('PrismaEditionRepository', () => {
  let database: TestDatabase;
  let repository: PrismaEditionRepository;

  beforeAll(async () => {
    database = await startTestDatabase();
    repository = new PrismaEditionRepository(database.prisma);

    await insertGame(
      database.prisma,
      aGame({ slug: 'second', name: 'Z game', editions: [free, paid, draft] }),
    );
    await insertGame(
      database.prisma,
      aGame({ slug: 'first', name: 'A game', editions: [anEdition({ slug: 'first-edition' })] }),
    );
    await insertGame(database.prisma, aGame({ slug: 'hidden', editions: [draftOnly] }));
    await insertCards(database.prisma, free, [
      aCard({
        id: 'card-b',
        kind: 'dare',
        template: 'Dare',
        tags: ['music', 'loud'],
        intensity: 3,
        penaltyShots: 2,
      }),
      aCard({ id: 'card-a', kind: 'truth', template: 'Truth', penaltyShots: null }),
    ]);
    await insertCards(database.prisma, paid, [aCard({ id: 'paid-card' })]);
  });

  afterAll(async () => {
    await database.stop();
  });

  describe('listPublishedGames', () => {
    it('sorts games by name and hides games without a published edition', async () => {
      const games = await repository.listPublishedGames();

      expect(games.map((game) => game.slug)).toEqual(['first', 'second']);
    });

    it('returns only published editions, sorted by name', async () => {
      const games = await repository.listPublishedGames();
      const second = games.find((game) => game.slug === 'second');

      expect(second?.editions.map((edition) => edition.slug)).toEqual(['paid', 'free']);
    });

    it('maps every edition field and loads no cards', async () => {
      const games = await repository.listPublishedGames();
      const second = games.find((game) => game.slug === 'second');

      expect(second?.editions).toStrictEqual([paid, free]);
    });
  });

  describe('findPublishedBySlug', () => {
    it('finds a published edition', async () => {
      await expect(repository.findPublishedBySlug('paid')).resolves.toStrictEqual(paid);
    });

    it('returns null for an unknown slug', async () => {
      await expect(repository.findPublishedBySlug('nope')).resolves.toBeNull();
    });

    it('returns null for an unpublished edition', async () => {
      await expect(repository.findPublishedBySlug('draft')).resolves.toBeNull();
    });
  });

  describe('findCardsByEditionId', () => {
    it('returns the cards of one edition sorted by id, with all fields', async () => {
      await expect(repository.findCardsByEditionId(free.id)).resolves.toStrictEqual([
        {
          id: 'card-a',
          kind: 'truth',
          template: 'Truth',
          tags: [],
          intensity: 1,
          penaltyShots: null,
        },
        {
          id: 'card-b',
          kind: 'dare',
          template: 'Dare',
          tags: ['music', 'loud'],
          intensity: 3,
          penaltyShots: 2,
        },
      ]);
    });

    it('returns nothing for an edition without cards', async () => {
      await expect(repository.findCardsByEditionId(draft.id)).resolves.toEqual([]);
    });
  });
});
