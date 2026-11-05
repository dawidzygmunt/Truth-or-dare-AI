import type { TruthOrDareKind, TruthOrDareState } from '@tod/game-engine';
import {
  selectCurrentCard,
  selectCurrentPlayer,
  selectPenalty,
  selectPenaltyMode,
  selectPhase,
} from '@tod/game-engine';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { pl } from '../../i18n/pl.js';
import { Avatar } from '../../shared/ui/avatar.js';
import { Button, topActionClasses } from '../../shared/ui/button.js';
import { ConfirmPanel } from '../../shared/ui/confirm-panel.js';
import { Dock } from '../../shared/ui/dock.js';
import { LoadingMessage } from '../../shared/ui/loading-message.js';
import { Screen, ScreenFrame } from '../../shared/ui/screen.js';
import { useGameStore } from './game-store-context.js';

const kindClasses: Readonly<Record<TruthOrDareKind, string>> = {
  truth: 'bg-card-truth shadow-glow-truth',
  dare: 'bg-card-dare shadow-glow-dare',
};

const kindLabels: Readonly<Record<TruthOrDareKind, string>> = {
  truth: pl.game.truth,
  dare: pl.game.dare,
};

/** What a screen reader says after a move. The screen shows the same through its layout. */
function announcement(game: TruthOrDareState): string {
  const card = selectCurrentCard(game);
  const penalty = selectPenalty(game);
  const player = selectCurrentPlayer(game);
  if (card !== null) {
    return pl.game.announceCard(kindLabels[card.kind], card.text);
  }
  if (penalty !== null) {
    return pl.game.penalty(penalty.player, penalty.shots);
  }
  return player === null ? '' : pl.game.announceTurn(player);
}

interface ChoiceTileProps {
  readonly kind: TruthOrDareKind;
  readonly mark: string;
  readonly testId: string;
  readonly onChoose: () => void;
}

function ChoiceTile({ kind, mark, testId, onChoose }: ChoiceTileProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      className={`relative flex min-h-40 items-end overflow-hidden rounded-card p-5.5 text-left font-display text-title font-bold text-ink ${kindClasses[kind]}`}
      onClick={onChoose}
    >
      <span aria-hidden="true" className="absolute -top-4 right-4 text-[120px] opacity-18">
        {mark}
      </span>
      {kindLabels[kind]}
    </button>
  );
}

const bigCardClasses =
  'flex min-h-[max(280px,46dvh)] flex-col justify-center gap-4.5 rounded-card px-5.5 py-7.5 text-center font-display font-bold text-ink';

const kindLabelClasses = 'text-label tracking-label uppercase';

/** Middle of the screen, above the actions. A tap on those never lands on what comes next. */
function TurnStage({ children }: { readonly children: ReactNode }) {
  return <div className="flex flex-1 flex-col justify-center gap-3">{children}</div>;
}

interface TurnControlsProps {
  readonly game: TruthOrDareState;
  readonly cardRef: RefObject<HTMLElement | null>;
}

function TurnControls({ game, cardRef }: TurnControlsProps) {
  const dispatch = useGameStore((state) => state.dispatch);
  const card = selectCurrentCard(game);
  const penalty = selectPenalty(game);

  if (selectPhase(game) === 'choosing') {
    return (
      <TurnStage>
        <ChoiceTile
          kind="truth"
          mark={pl.game.truthMark}
          testId="choose-truth"
          onChoose={() => {
            dispatch({ type: 'chooseTruth' });
          }}
        />
        <ChoiceTile
          kind="dare"
          mark={pl.game.dareMark}
          testId="choose-dare"
          onChoose={() => {
            dispatch({ type: 'chooseDare' });
          }}
        />
      </TurnStage>
    );
  }

  if (card !== null) {
    return (
      <>
        <TurnStage>
          <section
            ref={cardRef}
            tabIndex={-1}
            data-testid="card"
            className={`${bigCardClasses} outline-none ${kindClasses[card.kind]}`}
          >
            <p data-testid="card-kind" className={kindLabelClasses}>
              {kindLabels[card.kind]}
            </p>
            <p data-testid="card-text" className="text-card wrap-anywhere hyphens-auto">
              {card.text}
            </p>
          </section>
        </TurnStage>
        <Dock>
          <div className="flex gap-2.5 *:text-sm">
            <Button
              data-testid="mark-not-done"
              variant="secondary"
              onClick={() => {
                dispatch({ type: 'fail' });
              }}
            >
              {selectPenaltyMode(game) === 'shots' ? pl.game.notDoneShots : pl.game.notDone}
            </Button>
            <Button
              data-testid="mark-done"
              variant="success"
              onClick={() => {
                dispatch({ type: 'complete' });
              }}
            >
              {pl.game.done}
            </Button>
          </div>
        </Dock>
      </>
    );
  }

  return (
    <>
      <TurnStage>
        {penalty !== null && (
          <section className={`${bigCardClasses} ${kindClasses.dare}`}>
            <p className={kindLabelClasses}>{pl.game.penaltyLabel}</p>
            <p data-testid="penalty" className="text-title wrap-anywhere">
              {pl.game.penalty(penalty.player, penalty.shots)}
            </p>
          </section>
        )}
      </TurnStage>
      <Dock>
        <Button
          data-testid="next-turn"
          onClick={() => {
            dispatch({ type: 'nextTurn' });
          }}
        >
          {pl.game.next}
        </Button>
      </Dock>
    </>
  );
}

export function GameScreen() {
  const game = useGameStore((state) => state.game);
  const error = useGameStore((state) => state.error);
  const hydrated = useGameStore((state) => state.hydrated);
  const reset = useGameStore((state) => state.reset);
  const navigate = useNavigate();
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const phase = game?.phase;
  const player = game?.currentPlayer;

  // The buttons a player just used are gone after every move, which would drop focus to the body.
  useEffect(() => {
    if (!confirmingEnd) {
      (cardRef.current ?? titleRef.current)?.focus();
    }
  }, [phase, player, confirmingEnd]);

  if (game === null) {
    return hydrated ? (
      <Navigate to="/" replace />
    ) : (
      <Screen title={pl.game.title} centered>
        <LoadingMessage />
      </Screen>
    );
  }

  const currentPlayer = selectCurrentPlayer(game);

  return (
    <ScreenFrame tone="game">
      <div className="flex min-h-12 items-center">
        {!confirmingEnd && (
          <button
            type="button"
            data-testid="end-game"
            className={topActionClasses}
            onClick={() => {
              setConfirmingEnd(true);
            }}
          >
            <span aria-hidden="true">{pl.common.backSymbol}</span>
            {pl.game.end}
          </button>
        )}
      </div>
      <header className="flex items-center justify-center gap-2.5">
        {currentPlayer !== null && (
          <Avatar name={currentPlayer} index={game.queue.players.indexOf(currentPlayer)} />
        )}
        <p className="shrink-0 text-ink-soft">{pl.game.turn}</p>
        <h1
          ref={titleRef}
          tabIndex={-1}
          data-testid="current-player"
          className="min-w-0 font-bold wrap-anywhere outline-none"
        >
          {currentPlayer ?? pl.game.title}
        </h1>
      </header>
      <p data-testid="game-announcer" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement(game)}
      </p>
      {error !== null && (
        <p role="alert" data-testid="game-error" className="text-center text-sm text-danger">
          {pl.gameErrors[error]}
        </p>
      )}
      {confirmingEnd ? (
        <ConfirmPanel
          title={pl.game.endConfirm.title}
          description={pl.game.endConfirm.description}
          confirmLabel={pl.game.endConfirm.confirm}
          cancelLabel={pl.game.endConfirm.cancel}
          confirmTestId="end-game-confirm"
          cancelTestId="end-game-cancel"
          onConfirm={() => {
            reset();
            void navigate('/');
          }}
          onCancel={() => {
            setConfirmingEnd(false);
          }}
        />
      ) : (
        <div data-testid="turn-actions" className="flex flex-1 flex-col gap-6">
          <TurnControls game={game} cardRef={cardRef} />
        </div>
      )}
    </ScreenFrame>
  );
}
