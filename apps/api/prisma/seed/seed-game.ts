import type { PrismaClient } from '../../src/generated/prisma/client.js';
import type { SeedGame } from './seed-data.schema.js';

/** Applies the data as the source of truth: upserts by slug or card id, drops cards no longer listed. */
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
    },
    { timeout: 30_000 },
  );
}
