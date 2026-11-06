import type { CatalogEdition, CatalogGame } from '@tod/contracts';
import { Link } from 'react-router';
import { pl } from '../../i18n/pl.js';
import { useCatalogQuery } from '../../shared/api/queries.js';
import { ApiErrorMessage } from '../../shared/ui/api-error-message.js';
import { initialOf } from '../../shared/ui/avatar.js';
import { textActionClasses } from '../../shared/ui/button.js';
import { LoadingMessage } from '../../shared/ui/loading-message.js';
import { Screen } from '../../shared/ui/screen.js';
import { useGameStore } from '../truth-or-dare/game-store-context.js';

const editionClasses =
  'flex min-h-12 items-center justify-between gap-3 rounded-field bg-edition px-3.5 py-2 text-sm font-semibold';

const iconTones = [
  'bg-cyan/20 text-cyan',
  'bg-violet/25 text-pink',
  'bg-orange/22 text-orange',
] as const;

function ProBadge() {
  return (
    <>
      <span
        aria-hidden="true"
        className="shrink-0 rounded-badge bg-gold px-2 py-1 text-micro font-bold whitespace-nowrap text-on-gold"
      >
        {pl.catalog.locked}
      </span>
      <span className="sr-only">{pl.catalog.lockedHint}</span>
    </>
  );
}

interface EditionItemProps {
  readonly edition: CatalogEdition;
  /** The only way into the game: the link then covers the whole tile, as the design has it. */
  readonly coversTile: boolean;
}

function EditionItem({ edition, coversTile }: EditionItemProps) {
  const testId = `edition-${edition.slug}`;
  if (edition.locked) {
    return (
      <li data-testid={testId} className={`${editionClasses} text-ink-soft`}>
        <span className="min-w-0 wrap-anywhere">{edition.name}</span>
        <ProBadge />
      </li>
    );
  }
  return (
    <li>
      <Link
        data-testid={testId}
        className={`${editionClasses} ${coversTile ? 'after:absolute after:inset-0' : ''}`}
        to={`/setup/${edition.slug}`}
      >
        <span className="min-w-0 wrap-anywhere">{edition.name}</span>
        <span aria-hidden="true">{pl.common.forwardSymbol}</span>
      </Link>
    </li>
  );
}

function EditionList({ game }: { readonly game: CatalogGame }) {
  const onlyEdition = game.editions.length === 1;
  return (
    <ul className="flex flex-col gap-2">
      {game.editions.map((edition) => (
        <EditionItem key={edition.slug} edition={edition} coversTile={onlyEdition} />
      ))}
    </ul>
  );
}

function FeaturedGameTile({ game }: { readonly game: CatalogGame }) {
  return (
    <section
      data-testid={`game-${game.slug}`}
      className="relative col-span-2 flex flex-col gap-4 overflow-hidden rounded-tile bg-tile-featured p-4.5 text-ink"
    >
      <span
        aria-hidden="true"
        data-testid="featured-mark"
        className="pointer-events-none absolute -top-5.5 -right-1.5 font-display text-[84px] font-bold opacity-18 motion-safe:animate-scfloat"
      >
        {pl.catalog.featuredMark}
      </span>
      <div className="flex flex-col gap-1.5 pr-14">
        <h2 className="font-display text-tile font-bold">{game.name}</h2>
        <p className="text-label">{game.description}</p>
      </div>
      <EditionList game={game} />
    </section>
  );
}

function GameTile({ game, position }: { readonly game: CatalogGame; readonly position: number }) {
  const fitsHalfWidth = game.editions.length === 1 && game.editions[0]?.locked === false;
  const iconTone = iconTones[position % iconTones.length] ?? iconTones[0];
  return (
    <section
      data-testid={`game-${game.slug}`}
      className={`relative flex min-h-30 flex-col justify-between gap-3 rounded-tile border border-line bg-glass p-4 ${fitsHalfWidth ? 'col-span-1' : 'col-span-2'}`}
    >
      <span
        aria-hidden="true"
        className={`grid size-10 place-items-center rounded-icon font-display text-xl font-bold ${iconTone}`}
      >
        {initialOf(game.name)}
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-base leading-tight font-bold wrap-anywhere">
          {game.name}
        </h2>
        <p className="text-xs text-ink-muted">{game.description}</p>
      </div>
      <EditionList game={game} />
    </section>
  );
}

function CatalogContent() {
  const catalog = useCatalogQuery();

  if (catalog.data !== undefined) {
    return catalog.data.games.length === 0 ? (
      <p className="py-6 text-center text-ink-muted">{pl.catalog.empty}</p>
    ) : (
      <div className="flex flex-col gap-3.5">
        <p className="font-display text-base font-bold">{pl.catalog.allGames}</p>
        <div className="grid grid-cols-2 gap-3">
          {catalog.data.games.map((game, index) =>
            index === 0 ? (
              <FeaturedGameTile key={game.slug} game={game} />
            ) : (
              <GameTile key={game.slug} game={game} position={index - 1} />
            ),
          )}
        </div>
      </div>
    );
  }
  if (catalog.isError) {
    return (
      <ApiErrorMessage
        error={catalog.error}
        onRetry={() => {
          void catalog.refetch();
        }}
      />
    );
  }
  return <LoadingMessage />;
}

function ResumeCard() {
  return (
    <Link
      data-testid="resume-game"
      aria-label={pl.catalog.resume}
      className="flex items-center gap-3 rounded-tile-sm border border-resume-line bg-resume px-4 py-3.5"
      to="/game"
    >
      <span
        aria-hidden="true"
        className="grid size-10.5 shrink-0 place-items-center rounded-icon bg-resume-icon"
      >
        <svg viewBox="0 0 16 16" className="size-4 fill-current">
          <path d="M3 1.5v13l11-6.5z" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-micro font-semibold text-ink-soft uppercase">
          {pl.catalog.resume}
        </span>
        <span className="font-display text-[15px] font-bold">{pl.catalog.resumeGame}</span>
      </span>
      <span aria-hidden="true" className="ml-auto text-xl text-ink-soft">
        {pl.common.forwardSymbol}
      </span>
    </Link>
  );
}

export function CatalogScreen() {
  const hasGame = useGameStore((state) => state.game !== null);
  const error = useGameStore((state) => state.error);

  return (
    <Screen
      title={pl.catalog.title}
      overline={<p className="text-label font-semibold text-ink-muted">{pl.app.tagline}</p>}
    >
      {!hasGame && error !== null && (
        <p role="alert" data-testid="game-error" className="text-sm text-danger">
          {pl.gameErrors[error]}
        </p>
      )}
      {hasGame && <ResumeCard />}
      <CatalogContent />
      <Link data-testid="install-link" className={`${textActionClasses} mt-auto`} to="/install">
        {pl.catalog.install}
      </Link>
    </Screen>
  );
}
