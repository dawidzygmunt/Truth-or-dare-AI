import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';

const DIST = join(import.meta.dirname, '../../../apps/web/dist');

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

export interface ApiReply {
  readonly status?: number;
  readonly body: unknown;
}

export interface MockOrigin {
  readonly url: string;
  /** Answers by path, and can be changed while a test runs. Anything else under `/api` is a 404. */
  readonly api: Map<string, ApiReply>;
  /** Paths of `/api` requests that actually reached the network. */
  readonly apiRequests: string[];
  close(): Promise<void>;
}

async function serveFile(path: string): Promise<{ type: string; content: Buffer }> {
  const relative = normalize(path).replace(/^(\.\.[/\\])+/, '');
  const read = (file: string) => readFile(join(DIST, file));
  const content = await read(relative).catch(() => read('index.html'));
  const type = extname(relative);
  return { type: CONTENT_TYPES[type] ?? CONTENT_TYPES['.html'] ?? '', content };
}

/**
 * Serves the built app with a scripted api on its own origin. Answers an api cannot give, such as
 * a 200 for a paid edition, reach the service worker over a real network: Playwright's `route` does
 * not reliably see requests a worker makes itself.
 */
export async function startMockOrigin(): Promise<MockOrigin> {
  const api = new Map<string, ApiReply>();
  const apiRequests: string[] = [];

  const server: Server = createServer((request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (path.startsWith('/api/')) {
      apiRequests.push(path);
      const reply = api.get(path) ?? { status: 404, body: {} };
      response.writeHead(reply.status ?? 200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(reply.body));
      return;
    }
    void serveFile(path === '/' ? '/index.html' : path).then(({ type, content }) => {
      response.writeHead(200, { 'content-type': type });
      response.end(content);
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, 'localhost', resolve);
  });
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://localhost:${port}`,
    api,
    apiRequests,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => {
          resolve();
        });
      }),
  };
}
