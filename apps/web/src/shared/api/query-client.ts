import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-error.js';

const MAX_RETRIES = 1;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  const isTransient =
    error instanceof ApiError && (error.code === 'offline' || error.code === 'server');
  return isTransient && failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The default mode pauses queries while `navigator.onLine` is false, so requests would
        // never reach the service worker that answers them from its cache.
        networkMode: 'always',
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  });
}
