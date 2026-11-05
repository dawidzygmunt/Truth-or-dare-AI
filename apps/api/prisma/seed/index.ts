import { PrismaService } from '../../src/database/prisma.service.js';
import { SeedGameSchema } from './seed-data.schema.js';
import { seedGame } from './seed-game.js';
import truthOrDare from './truth-or-dare.json' with { type: 'json' };

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const prisma = new PrismaService(process.env.DATABASE_URL);

try {
  const game = SeedGameSchema.parse(truthOrDare);
  await seedGame(prisma, game);
  const cards = game.editions.reduce((total, edition) => total + edition.cards.length, 0);
  console.log(`Seeded ${game.slug}: ${game.editions.length} edition(s), ${cards} cards`);
} finally {
  await prisma.$disconnect();
}
