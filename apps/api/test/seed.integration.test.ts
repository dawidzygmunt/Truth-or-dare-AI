import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedGame } from '../prisma/seed/seed-game.js';
import type { SeedCard, SeedGame } from '../prisma/seed/seed-data.schema.js';
import { startTestDatabase, type TestDatabase } from './support/test-database.js';

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
});
