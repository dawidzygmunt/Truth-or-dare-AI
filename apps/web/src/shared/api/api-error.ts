export type ApiErrorCode =
  'edition_locked' | 'not_found' | 'offline' | 'server' | 'invalid_response';

/** `code` is stable, so the UI can map it to a translated message. */
export class ApiError extends Error {
  constructor(readonly code: ApiErrorCode) {
    super(`Api request failed: ${code}`);
  }
}

export function apiErrorCode(error: unknown): ApiErrorCode {
  return error instanceof ApiError ? error.code : 'server';
}
