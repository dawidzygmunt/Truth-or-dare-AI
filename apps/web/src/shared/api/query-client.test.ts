import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error.js';
import { createQueryClient, shouldRetry } from './query-client.js';

describe('createQueryClient', () => {
  it('always reaches fetch, because offline answers come from the service worker', () => {
    expect(createQueryClient().getDefaultOptions().queries?.networkMode).toBe('always');
  });
});

describe('shouldRetry', () => {
  it.each(['offline', 'server'] as const)('retries %s once', (code) => {
    expect(shouldRetry(0, new ApiError(code))).toBe(true);
    expect(shouldRetry(1, new ApiError(code))).toBe(false);
  });

  it.each(['edition_locked', 'not_found', 'invalid_response'] as const)(
    'does not retry %s',
    (code) => {
      expect(shouldRetry(0, new ApiError(code))).toBe(false);
    },
  );

  it('does not retry unexpected errors', () => {
    expect(shouldRetry(0, new Error('bug'))).toBe(false);
  });
});
