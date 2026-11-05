import type { PrismaClient } from '../../src/generated/prisma/client.js';
import type { SeedGame } from './seed-data.schema.js';

/**
 * Applies the data as the source of truth for one game: upserts by slug or card id and drops cards
 * no longer listed in their edition. Editions of the game that are not in the data are unpublished,
 * never deleted. Other games and editions outside the data are left alone.
 */
export async function seedGame(prisma: PrismaClient, game: SeedGame): Promise<void> {
  const { editions, ...gameData } = game;

  await prisma.$transaction(
    async (tx) => {
      const { id: gameId } = await tx.game.upsert({
        where: { slug: game.slug },
        create: gameData,
        update: gameData,
      });

      for (const { cards, ...editionData } of editions) {
        const data = { ...editionData, gameId };
        const { id: editionId } = await tx.edition.upsert({
          where: { slug: editionData.slug },
          create: data,
          update: data,
        });

        await tx.card.deleteMany({
          where: { editionId, id: { notIn: cards.map(({ id }) => id) } },
        });
        for (const card of cards) {
          const cardData = { ...card, editionId };
          await tx.card.upsert({ where: { id: card.id }, create: cardData, update: cardData });
        }
      }

      await tx.edition.updateMany({
        where: { gameId, slug: { notIn: editions.map(({ slug }) => slug) } },
        data: { isPublished: false },
      });
    },
    { timeout: 30_000 },
  );
}
