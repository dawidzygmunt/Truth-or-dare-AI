import { pl } from '../../i18n/pl.js';

export function LoadingMessage() {
  return (
    <p role="status" className="py-6 text-center text-sm text-ink-muted motion-safe:animate-pulse">
      {pl.common.loading}
    </p>
  );
}
