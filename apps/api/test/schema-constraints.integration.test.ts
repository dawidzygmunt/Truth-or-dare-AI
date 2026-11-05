import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { aCard, aGame, anEdition } from './support/catalog-fixtures.js';
import {
  insertCards,
  insertGame,
  startTestDatabase,
  type TestDatabase,
} from './support/test-database.js';

describe('database constraints', () => {
  let database: TestDatabase;
  const edition = anEdition({ slug: 'constraints-edition' });

  beforeAll(async () => {
    database = await startTestDatabase();
    await insertGame(database.prisma, aGame({ slug: 'constraints-game', editions: [edition] }));
  });

  afterAll(async () => {
    await database.stop();
  });

  describe('Card.intensity', () => {
    it.each([1, 3, 5])('accepts %i', async (intensity) => {
      await expect(
        insertCards(database.prisma, edition, [aCard({ intensity })]),
      ).resolves.toBeUndefined();
    });

    it.each([0, 6, -1])('rejects %i', async (intensity) => {
      await expect(insertCards(database.prisma, edition, [aCard({ intensity })])).rejects.toThrow(
        /Card_intensity_range/,
      );
    });
  });

  describe('Card.penaltyShots', () => {
    it.each([null, 1, 3])('accepts %s', async (penaltyShots) => {
      await expect(
        insertCards(database.prisma, edition, [aCard({ penaltyShots })]),
      ).resolves.toBeUndefined();
    });

    it.each([0, -1])('rejects %i', async (penaltyShots) => {
      await expect(
        insertCards(database.prisma, edition, [aCard({ penaltyShots })]),
      ).rejects.toThrow(/Card_penaltyShots_positive/);
    });
  });

  describe('Edition.intensity', () => {
    it.each([0, 6])('rejects %i', async (intensity) => {
      const invalid = anEdition({ intensity });

      await expect(insertGame(database.prisma, aGame({ editions: [invalid] }))).rejects.toThrow(
        /Edition_intensity_range/,
      );
    });
  });
});
