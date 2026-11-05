import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedGame } from '../prisma/seed/seed-game.js';
import type { SeedCard, SeedGame } from '../prisma/seed/seed-data.schema.js';
import { aCard, aGame, anEdition } from './support/catalog-fixtures.js';
import {
  insertCards,
  insertGame,
  startTestDatabase,
  type TestDatabase,
} from './support/test-database.js';

const card = (id: string, overrides: Partial<SeedCard> = {}): SeedCard => ({
  id,
  kind: 'truth',
  template: `{player}, pytanie ${id}?`,
  tags: [],
  intensity: 1,
  penaltyShots: null,
  ...overrides,
});

const game = (cards: SeedCard[], name = 'Klasyczna'): SeedGame => ({
  slug: 'seed-test-game',
  name: 'Gra',
  description: 'Opis',
  engine: 'card_deck',
  editions: [
    {
      slug: 'seed-test-edition',
      name,
      tier: 'free',
      productId: null,
      intensity: 1,
      ageRating: 18,
      platforms: ['web', 'android'],
      locale: 'pl',
      isPublished: true,
      cards,
    },
  ],
});

describe('seedGame', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await startTestDatabase();
  });

  afterAll(async () => {
    await database.stop();
  });

  it('creates the game, its editions and cards', async () => {
    await seedGame(database.prisma, game([card('a', { penaltyShots: 2 }), card('b')]));

    await expect(database.prisma.game.count()).resolves.toBe(1);
    await expect(database.prisma.edition.count()).resolves.toBe(1);
    await expect(database.prisma.card.findUnique({ where: { id: 'a' } })).resolves.toMatchObject({
      penaltyShots: 2,
    });
  });

  it('is idempotent: a second run changes nothing', async () => {
    const data = game([card('a', { penaltyShots: 2 }), card('b')]);

    await seedGame(database.prisma, data);
    const before = await database.prisma.card.findMany({ orderBy: { id: 'asc' } });
    await seedGame(database.prisma, data);
    const after = await database.prisma.card.findMany({ orderBy: { id: 'asc' } });

    await expect(database.prisma.game.count()).resolves.toBe(1);
    await expect(database.prisma.edition.count()).resolves.toBe(1);
    expect(after).toEqual(before);
  });

  it('updates changed content and removes cards dropped from the data', async () => {
    await seedGame(database.prisma, game([card('a'), card('b')]));

    await seedGame(
      database.prisma,
      game([card('a', { template: '{player}, nowa treść?' })], 'Nowa nazwa'),
    );

    const cards = await database.prisma.card.findMany();
    expect(cards.map(({ id, template }) => ({ id, template }))).toEqual([
      { id: 'a', template: '{player}, nowa treść?' },
    ]);
    await expect(
      database.prisma.edition.findUnique({ where: { slug: 'seed-test-edition' } }),
    ).resolves.toMatchObject({ name: 'Nowa nazwa' });
  });

  describe('with content the data does not describe', () => {
    beforeEach(async () => {
      await database.prisma.card.deleteMany();
      await database.prisma.edition.deleteMany();
      await database.prisma.game.deleteMany();
    });

    it('leaves the editions and cards of other games alone', async () => {
      const edition = anEdition({ slug: 'other-game-edition' });
      await insertGame(
        database.prisma,
        aGame({ slug: 'other-game', name: 'Inna gra', editions: [edition] }),
      );
      await insertCards(database.prisma, edition, [aCard({ id: 'other-game-card' })]);

      await seedGame(database.prisma, game([card('a'), card('b')]));

      await expect(
        database.prisma.card.findUnique({ where: { id: 'other-game-card' } }),
      ).resolves.not.toBeNull();
      await expect(
        database.prisma.edition.findUnique({ where: { slug: 'other-game-edition' } }),
      ).resolves.toMatchObject({ isPublished: true });
    });

    it('keeps the cards of a sibling edition that the data does not list', async () => {
      const sibling = anEdition({ slug: 'sibling-edition' });
      await insertGame(
        database.prisma,
        aGame({ slug: 'seed-test-game', name: 'Gra', editions: [sibling] }),
      );
      await insertCards(database.prisma, sibling, [aCard({ id: 'sibling-card' })]);

      await seedGame(database.prisma, game([card('a')]));

      await expect(
        database.prisma.card.findUnique({ where: { id: 'sibling-card' } }),
      ).resolves.not.toBeNull();
      await expect(database.prisma.card.findUnique({ where: { id: 'a' } })).resolves.not.toBeNull();
    });

    it('unpublishes, without deleting, editions of the game that left the data', async () => {
      const removed = anEdition({ slug: 'removed-edition' });
      await insertGame(
        database.prisma,
        aGame({ slug: 'seed-test-game', name: 'Gra', editions: [removed] }),
      );

      await seedGame(database.prisma, game([card('a')]));

      await expect(
        database.prisma.edition.findUnique({ where: { slug: 'removed-edition' } }),
      ).resolves.toMatchObject({ isPublished: false });
      await expect(
        database.prisma.edition.findUnique({ where: { slug: 'seed-test-edition' } }),
      ).resolves.toMatchObject({ isPublished: true });
    });

    it('unpublishes the old edition when a slug is renamed', async () => {
      await seedGame(database.prisma, game([card('a')]));
      const renamed = game([card('a')]);
      const [edition] = renamed.editions;
      if (!edition) throw new Error('fixture has an edition');
      edition.slug = 'seed-test-edition-renamed';

      await seedGame(database.prisma, renamed);

      const editions = await database.prisma.edition.findMany({ orderBy: { slug: 'asc' } });
      expect(editions.map(({ slug, isPublished }) => ({ slug, isPublished }))).toEqual([
        { slug: 'seed-test-edition', isPublished: false },
        { slug: 'seed-test-edition-renamed', isPublished: true },
      ]);
    });
  });
});
