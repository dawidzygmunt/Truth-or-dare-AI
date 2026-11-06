import { pl } from '../../i18n/pl.js';
import { apiErrorCode } from '../api/api-error.js';
import { Button } from './button.js';

interface ApiErrorMessageProps {
  readonly error: unknown;
  readonly onRetry: () => void;
}

const NOT_RETRYABLE = new Set(['edition_locked', 'not_found']);

export function ApiErrorMessage({ error, onRetry }: ApiErrorMessageProps) {
  const code = apiErrorCode(error);
  return (
    <>
      <p role="alert" data-testid="api-error" className="text-center text-sm text-danger">
        {pl.apiErrors[code]}
      </p>
      {!NOT_RETRYABLE.has(code) && (
        <Button data-testid="api-error-retry" variant="secondary" onClick={onRetry}>
          {pl.common.retry}
        </Button>
      )}
    </>
  );
}
