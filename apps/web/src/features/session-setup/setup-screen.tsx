import type { PenaltyMode } from '@tod/game-engine';
import { useRef, useState, type SyntheticEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { pl } from '../../i18n/pl.js';
import { useDeckQuery } from '../../shared/api/queries.js';
import { ApiErrorMessage } from '../../shared/ui/api-error-message.js';
import { Button, textActionClasses } from '../../shared/ui/button.js';
import { ConfirmPanel } from '../../shared/ui/confirm-panel.js';
import { LoadingMessage } from '../../shared/ui/loading-message.js';
import { Screen } from '../../shared/ui/screen.js';
import { useGameStore } from '../truth-or-dare/game-store-context.js';
import type { GameSetupErrorCode } from '../truth-or-dare/game-store.js';

const PENALTY_OPTIONS: readonly { mode: PenaltyMode; label: string }[] = [
  { mode: 'none', label: pl.setup.penaltyNone },
  { mode: 'shots', label: pl.setup.penaltyShots },
];

export function SetupScreen() {
  const { editionSlug = '' } = useParams();
  const deck = useDeckQuery(editionSlug);
  const start = useGameStore((state) => state.start);
  const hasGame = useGameStore((state) => state.game !== null);
  const navigate = useNavigate();

  const [players, setPlayers] = useState<readonly string[]>([]);
  const [draft, setDraft] = useState('');
  const [penaltyMode, setPenaltyMode] = useState<PenaltyMode>('none');
  const [setupError, setSetupError] = useState<GameSetupErrorCode | null>(null);
  const [confirmingReplace, setConfirmingReplace] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const addPlayer = (event: SyntheticEvent) => {
    event.preventDefault();
    if (draft.trim() === '') {
      return;
    }
    setPlayers([...players, draft]);
    setDraft('');
    setSetupError(null);
    // Tapping the button took focus away, which closes the keyboard between players.
    nameInputRef.current?.focus();
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_player, position) => position !== index));
    setSetupError(null);
  };

  const startGame = () => {
    setConfirmingReplace(false);
    if (deck.data === undefined) {
      return;
    }
    const error = start({ players, cards: deck.data.cards, penaltyMode });
    setSetupError(error);
    if (error === null) {
      void navigate('/game');
    }
  };

  return (
    <Screen title={pl.setup.title}>
      <form className="flex flex-col gap-3" onSubmit={addPlayer}>
        <label className="flex flex-col gap-1">
          <span>{pl.setup.playerName}</span>
          <input
            ref={nameInputRef}
            data-testid="player-name-input"
            className="min-h-12 rounded-xl border border-neutral-600 bg-transparent px-4 text-lg"
            autoComplete="off"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
          />
        </label>
        <Button
          data-testid="add-player"
          type="submit"
          variant="secondary"
          disabled={draft.trim() === ''}
        >
          {pl.setup.addPlayer}
        </Button>
      </form>

      {players.length > 0 && (
        <ul aria-label={pl.setup.playersList} className="flex flex-col gap-2">
          {players.map((player, index) => (
            <li
              key={`${index}-${player}`}
              data-testid="player-item"
              className="flex items-center justify-between gap-3 text-lg"
            >
              <span>{player}</span>
              <button
                type="button"
                className="min-h-12 min-w-12 text-2xl"
                aria-label={pl.setup.removePlayer(player)}
                onClick={() => {
                  removePlayer(index);
                }}
              >
                {pl.setup.removeSymbol}
              </button>
            </li>
          ))}
        </ul>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1">{pl.setup.penaltyMode}</legend>
        {PENALTY_OPTIONS.map(({ mode, label }) => (
          <label key={mode} className="flex min-h-12 items-center gap-3 text-lg">
            <input
              data-testid={`penalty-mode-${mode}`}
              type="radio"
              name="penalty-mode"
              className="size-5"
              checked={penaltyMode === mode}
              onChange={() => {
                setPenaltyMode(mode);
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {setupError !== null && (
        <p role="alert" data-testid="setup-error" className="text-red-400">
          {pl.gameErrors[setupError]}
        </p>
      )}
      {deck.isPending && <LoadingMessage />}
      {deck.isError && deck.data === undefined && (
        <ApiErrorMessage
          error={deck.error}
          onRetry={() => {
            void deck.refetch();
          }}
        />
      )}

      {confirmingReplace ? (
        <ConfirmPanel
          title={pl.setup.replaceConfirm.title}
          description={pl.setup.replaceConfirm.description}
          confirmLabel={pl.setup.replaceConfirm.confirm}
          cancelLabel={pl.setup.replaceConfirm.cancel}
          confirmTestId="replace-game-confirm"
          cancelTestId="replace-game-cancel"
          onConfirm={startGame}
          onCancel={() => {
            setConfirmingReplace(false);
          }}
        />
      ) : (
        <Button
          data-testid="start-game"
          disabled={deck.data === undefined}
          onClick={() => {
            if (hasGame) {
              setConfirmingReplace(true);
            } else {
              startGame();
            }
          }}
        >
          {pl.setup.start}
        </Button>
      )}
      <Link data-testid="back-link" className={textActionClasses} to="/">
        {pl.common.back}
      </Link>
    </Screen>
  );
}
