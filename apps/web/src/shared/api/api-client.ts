import {
  CatalogResponseSchema,
  DeckResponseSchema,
  type CatalogResponse,
  type DeckResponse,
} from '@tod/contracts';
import type { z } from 'zod';
import { ApiError } from './api-error.js';

export const REQUEST_TIMEOUT_MS = 10_000;

function errorForStatus(status: number): ApiError {
  if (status === 401 || status === 403) return new ApiError('edition_locked');
  if (status === 404) return new ApiError('not_found');
  return new ApiError('server');
}

async function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(`/api${path}`, { signal }).catch(() => {
    throw new ApiError('offline');
  });
  if (!response.ok) {
    throw errorForStatus(response.status);
  }
  const body: unknown = await response.json().catch(() => {
    if (signal.aborted) {
      throw new ApiError('offline');
    }
    return null;
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('invalid_response');
  }
  return parsed.data;
}

export function fetchCatalog(): Promise<CatalogResponse> {
  return getJson('/catalog', CatalogResponseSchema);
}

export function fetchDeck(editionSlug: string): Promise<DeckResponse> {
  return getJson(`/editions/${encodeURIComponent(editionSlug)}/deck`, DeckResponseSchema);
}
