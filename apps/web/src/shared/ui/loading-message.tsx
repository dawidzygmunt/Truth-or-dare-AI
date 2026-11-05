import { pl } from '../../i18n/pl.js';

export function LoadingMessage() {
  return (
    <p role="status" className="text-neutral-400">
      {pl.common.loading}
    </p>
  );
}
