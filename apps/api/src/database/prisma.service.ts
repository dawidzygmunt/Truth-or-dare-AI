import { PrismaPg } from '@prisma/adapter-pg';
import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * The connection pool opens on the first query, so the api boots and /health answers without a
 * database. A missing or wrong DATABASE_URL shows up as a failed catalog request.
 */
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(connectionString: string | undefined) {
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
