import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaService } from '../../src/database/prisma.service.js';
import type { Card } from '../../src/modules/catalog/domain/card.js';
import type { Edition } from '../../src/modules/catalog/domain/edition.js';
import type { GameWithEditions } from '../../src/modules/catalog/domain/game.js';

const apiRoot = resolve(import.meta.dirname, '../..');

export interface TestDatabase {
  url: string;
  prisma: PrismaService;
  stop(): Promise<void>;
}

/** A throwaway Postgres (same major as docker-compose.yml) with the committed migrations applied. */
export async function startTestDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const url = container.getConnectionUri();

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });

  const prisma = new PrismaService(url);

  return {
    url,
    prisma,
    async stop() {
      await prisma.$disconnect();
      await container.stop();
    },
  };
}

export async function insertGame(prisma: PrismaService, game: GameWithEditions): Promise<void> {
  const { editions, ...fields } = game;
  await prisma.game.create({ data: { ...fields, editions: { create: editions } } });
}

export async function insertCards(
  prisma: PrismaService,
  edition: Edition,
  cards: Card[],
): Promise<void> {
  await prisma.card.createMany({
    data: cards.map((card) => ({ ...card, editionId: edition.id })),
  });
}
