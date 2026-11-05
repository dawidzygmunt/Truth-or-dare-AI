import { pl } from '../../i18n/pl.js';

export function Wordmark() {
  return (
    <div className="mb-5 flex flex-col items-center gap-3">
      <p className="bg-wordmark bg-clip-text font-display text-wordmark font-bold tracking-display text-transparent">
        {pl.app.title}
      </p>
      <p className="text-sm text-ink-muted">{pl.app.tagline}</p>
    </div>
  );
}
