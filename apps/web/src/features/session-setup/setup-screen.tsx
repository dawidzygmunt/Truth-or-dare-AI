import type { PenaltyMode } from '@tod/game-engine';
import { useId, useRef, useState, type SyntheticEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { pl } from '../../i18n/pl.js';
import { useDeckQuery } from '../../shared/api/queries.js';
import { ApiErrorMessage } from '../../shared/ui/api-error-message.js';
import { Avatar } from '../../shared/ui/avatar.js';
import { BackLink } from '../../shared/ui/back-link.js';
import { Button } from '../../shared/ui/button.js';
import { ConfirmPanel } from '../../shared/ui/confirm-panel.js';
import { Dock } from '../../shared/ui/dock.js';
import { LoadingMessage } from '../../shared/ui/loading-message.js';
import { Screen } from '../../shared/ui/screen.js';
import { useGameStore } from '../truth-or-dare/game-store-context.js';
import type { GameSetupErrorCode } from '../truth-or-dare/game-store.js';

interface PenaltyOptionCopy {
  readonly mode: PenaltyMode;
  readonly label: string;
  readonly hint: string;
  readonly icon: string;
}

const PENALTY_OPTIONS: readonly PenaltyOptionCopy[] = [
  {
    mode: 'none',
    label: pl.setup.penaltyNone,
    hint: pl.setup.penaltyNoneHint,
    icon: pl.setup.penaltyNoneIcon,
  },
  {
    mode: 'shots',
    label: pl.setup.penaltyShots,
    hint: pl.setup.penaltyShotsHint,
    icon: pl.setup.penaltyShotsIcon,
  },
];

interface PenaltyOptionProps {
  readonly option: PenaltyOptionCopy;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

function PenaltyOption({ option, selected, onSelect }: PenaltyOptionProps) {
  const labelId = useId();
  const hintId = useId();
  const stateClasses = selected
    ? 'border-selected bg-picked shadow-glow-selected'
    : 'border-line bg-glass';
  return (
    <label
      className={`relative flex min-h-12 items-center gap-3.5 rounded-tile-sm border-[1.5px] px-4 py-3.5 ${stateClasses}`}
    >
      {/* Transparent and as large as the card: a real radio, which the card only dresses up. */}
      <input
        data-testid={`penalty-mode-${option.mode}`}
        type="radio"
        name="penalty-mode"
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className="absolute inset-0 appearance-none rounded-tile-sm"
        checked={selected}
        onChange={onSelect}
      />
      <span aria-hidden="true" className="text-2xl">
        {option.icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span id={labelId} className="font-display text-[17px] font-bold">
          {option.label}
        </span>
        <span id={hintId} className={`text-xs ${selected ? 'text-ink-soft' : 'text-ink-muted'}`}>
          {option.hint}
        </span>
      </span>
      {selected && (
        <span
          aria-hidden="true"
          className="ml-auto grid size-5.5 shrink-0 place-items-center rounded-full bg-selected text-xs text-on-pink"
        >
          {pl.common.checkSymbol}
        </span>
      )}
    </label>
  );
}

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
    <Screen title={pl.setup.title} subtitle={pl.setup.subtitle} topBar={<BackLink />}>
      <div className="flex flex-col gap-2.5">
        {players.length > 0 && (
          <ul aria-label={pl.setup.playersList} className="flex flex-col gap-2.5">
            {players.map((player, index) => (
              <li
                key={`${index}-${player}`}
                data-testid="player-item"
                className="flex min-h-14 items-center gap-3 rounded-field bg-glass py-1 pr-1 pl-3"
              >
                <Avatar name={player} index={index} />
                <span className="min-w-0 flex-1 text-[15px] font-semibold wrap-anywhere">
                  {player}
                </span>
                <button
                  type="button"
                  className="min-h-12 min-w-12 shrink-0 text-lg text-ink-muted"
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

        <form
          className="flex min-h-14 items-center gap-1 rounded-field border-[1.5px] border-dashed border-line-dashed py-1 pr-3 pl-1.5 focus-within:border-cyan"
          onSubmit={addPlayer}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">{pl.setup.playerName}</span>
            <input
              ref={nameInputRef}
              data-testid="player-name-input"
              className="min-h-12 w-full bg-transparent text-base font-semibold outline-none placeholder:text-ink-muted"
              autoComplete="off"
              placeholder={pl.setup.addPlayer}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
            />
          </label>
          <button
            data-testid="add-player"
            type="submit"
            aria-label={pl.setup.addPlayer}
            className="group order-first grid size-12 shrink-0 place-items-center"
            disabled={draft.trim() === ''}
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-cta text-xl shadow-glow-cta group-disabled:border-[1.5px] group-disabled:border-line-dashed group-disabled:bg-none group-disabled:text-ink-muted group-disabled:shadow-none"
            >
              {pl.setup.addSymbol}
            </span>
          </button>
        </form>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 font-display text-base font-bold">{pl.setup.penaltyMode}</legend>
        {PENALTY_OPTIONS.map((option) => (
          <PenaltyOption
            key={option.mode}
            option={option}
            selected={penaltyMode === option.mode}
            onSelect={() => {
              setPenaltyMode(option.mode);
            }}
          />
        ))}
      </fieldset>

      <Dock>
        {setupError !== null && (
          <p role="alert" data-testid="setup-error" className="text-center text-sm text-danger">
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
        {!confirmingReplace && (
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
      </Dock>
      {confirmingReplace && (
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
      )}
    </Screen>
  );
}
