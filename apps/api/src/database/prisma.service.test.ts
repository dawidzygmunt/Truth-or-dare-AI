import { createServer, type Server, type Socket } from 'node:net';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from './prisma.service.js';

const CONNECTION_TIMEOUT_MS = 5_000;

/** Accepts TCP connections and never answers, like a database that is up but not responding. */
function listenSilently(): Promise<{ server: Server; port: number; sockets: Socket[] }> {
  const sockets: Socket[] = [];
  const server = createServer((socket) => sockets.push(socket));
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: (server.address() as AddressInfo).port, sockets });
    });
  });
}

describe('PrismaService', () => {
  let silent: Awaited<ReturnType<typeof listenSilently>>;
  let prisma: PrismaService | undefined;

  beforeEach(async () => {
    silent = await listenSilently();
  });

  afterEach(async () => {
    await prisma?.$disconnect();
    silent.sockets.forEach((socket) => socket.destroy());
    silent.server.close();
  });

  it('gives up on an unresponsive database instead of hanging the request', async () => {
    prisma = new PrismaService(`postgresql://user:pass@127.0.0.1:${silent.port}/db`);
    const startedAt = Date.now();

    await expect(prisma.$queryRaw`SELECT 1`).rejects.toThrow();

    expect(Date.now() - startedAt).toBeLessThan(CONNECTION_TIMEOUT_MS + 2_000);
  }, 15_000);
});
