import { PrismaPg } from '@prisma/adapter-pg';
import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';

/** Without a limit, pg waits for an unresponsive database until the OS gives up (minutes). */
const CONNECTION_TIMEOUT_MS = 5_000;

/**
 * The connection pool opens on the first query, so the api boots and /health answers without a
 * database. A missing or wrong DATABASE_URL shows up as a failed catalog request, and an
 * unresponsive database as one that fails after CONNECTION_TIMEOUT_MS.
 */
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(connectionString: string | undefined) {
    super({
      adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
