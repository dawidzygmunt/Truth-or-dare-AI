import type { CatalogEdition, CatalogGame } from '@tod/contracts';
import { Link } from 'react-router';
import { pl } from '../../i18n/pl.js';
import { useCatalogQuery } from '../../shared/api/queries.js';
import { ApiErrorMessage } from '../../shared/ui/api-error-message.js';
import { buttonClasses, textActionClasses } from '../../shared/ui/button.js';
import { LoadingMessage } from '../../shared/ui/loading-message.js';
import { Screen } from '../../shared/ui/screen.js';
import { useGameStore } from '../truth-or-dare/game-store-context.js';

function EditionItem({ edition }: { readonly edition: CatalogEdition }) {
  const testId = `edition-${edition.slug}`;
  if (edition.locked) {
    return (
      <li
        data-testid={testId}
        className={`${buttonClasses.secondary} flex justify-between opacity-50`}
      >
        <span>{edition.name}</span>
        <span>{pl.catalog.locked}</span>
      </li>
    );
  }
  return (
    <li>
      <Link data-testid={testId} className={buttonClasses.primary} to={`/setup/${edition.slug}`}>
        {edition.name}
      </Link>
    </li>
  );
}

function GameSection({ game }: { readonly game: CatalogGame }) {
  return (
    <section className="flex flex-col gap-3" data-testid={`game-${game.slug}`}>
      <h2 className="text-xl font-semibold">{game.name}</h2>
      <p className="text-neutral-400">{game.description}</p>
      <ul className="flex flex-col gap-3">
        {game.editions.map((edition) => (
          <EditionItem key={edition.slug} edition={edition} />
        ))}
      </ul>
    </section>
  );
}

function CatalogContent() {
  const catalog = useCatalogQuery();

  if (catalog.data !== undefined) {
    return catalog.data.games.length === 0 ? (
      <p className="text-neutral-400">{pl.catalog.empty}</p>
    ) : (
      catalog.data.games.map((game) => <GameSection key={game.slug} game={game} />)
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

export function CatalogScreen() {
  const hasGame = useGameStore((state) => state.game !== null);
  const error = useGameStore((state) => state.error);

  return (
    <Screen title={pl.catalog.title}>
      {!hasGame && error !== null && (
        <p role="alert" data-testid="game-error" className="text-red-400">
          {pl.gameErrors[error]}
        </p>
      )}
      {hasGame && (
        <Link data-testid="resume-game" className={buttonClasses.primary} to="/game">
          {pl.catalog.resume}
        </Link>
      )}
      <CatalogContent />
      <Link data-testid="install-link" className={textActionClasses} to="/install">
        {pl.catalog.install}
      </Link>
    </Screen>
  );
}
