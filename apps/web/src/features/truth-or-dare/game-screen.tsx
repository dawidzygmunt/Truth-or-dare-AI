import type { TruthOrDareState } from '@tod/game-engine';
import {
  selectCurrentCard,
  selectCurrentPlayer,
  selectPenalty,
  selectPhase,
} from '@tod/game-engine';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { pl } from '../../i18n/pl.js';
import { Button, textActionClasses } from '../../shared/ui/button.js';
import { ConfirmPanel } from '../../shared/ui/confirm-panel.js';
import { LoadingMessage } from '../../shared/ui/loading-message.js';
import { Screen } from '../../shared/ui/screen.js';
import { useGameStore } from './game-store-context.js';

/** What a screen reader says after a move. The screen shows the same through its layout. */
function announcement(game: TruthOrDareState): string {
  const card = selectCurrentCard(game);
  const penalty = selectPenalty(game);
  const player = selectCurrentPlayer(game);
  if (card !== null) {
    return pl.game.announceCard(card.kind === 'truth' ? pl.game.truth : pl.game.dare, card.text);
  }
  if (penalty !== null) {
    return pl.game.penalty(penalty.player, penalty.shots);
  }
  return player === null ? '' : pl.game.announceTurn(player);
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
      <>
        <Button
          data-testid="choose-truth"
          onClick={() => {
            dispatch({ type: 'chooseTruth' });
          }}
        >
          {pl.game.truth}
        </Button>
        <Button
          data-testid="choose-dare"
          onClick={() => {
            dispatch({ type: 'chooseDare' });
          }}
        >
          {pl.game.dare}
        </Button>
      </>
    );
  }

  if (card !== null) {
    return (
      <>
        <section
          ref={cardRef}
          tabIndex={-1}
          data-testid="card"
          className="flex flex-col gap-2 rounded-xl border border-neutral-600 p-4 outline-none"
        >
          <p data-testid="card-kind" className="text-neutral-400">
            {card.kind === 'truth' ? pl.game.truth : pl.game.dare}
          </p>
          <p data-testid="card-text" className="text-xl">
            {card.text}
          </p>
        </section>
        <Button
          data-testid="mark-done"
          onClick={() => {
            dispatch({ type: 'complete' });
          }}
        >
          {pl.game.done}
        </Button>
        <Button
          data-testid="mark-not-done"
          variant="secondary"
          onClick={() => {
            dispatch({ type: 'fail' });
          }}
        >
          {pl.game.notDone}
        </Button>
      </>
    );
  }

  return (
    <>
      {penalty !== null && (
        <p data-testid="penalty" className="text-2xl font-semibold">
          {pl.game.penalty(penalty.player, penalty.shots)}
        </p>
      )}
      <Button
        data-testid="next-turn"
        onClick={() => {
          dispatch({ type: 'nextTurn' });
        }}
      >
        {pl.game.next}
      </Button>
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
      <Screen title={pl.game.title}>
        <LoadingMessage />
      </Screen>
    );
  }

  return (
    <Screen
      title={selectCurrentPlayer(game) ?? pl.game.title}
      titleTestId="current-player"
      titleRef={titleRef}
      action={
        !confirmingEnd && (
          <button
            type="button"
            data-testid="end-game"
            className={`${textActionClasses} shrink-0 text-neutral-400`}
            onClick={() => {
              setConfirmingEnd(true);
            }}
          >
            {pl.game.end}
          </button>
        )
      }
    >
      <p data-testid="game-announcer" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement(game)}
      </p>
      {error !== null && (
        <p role="alert" data-testid="game-error" className="text-red-400">
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
        <div data-testid="turn-actions" className="flex flex-col gap-6">
          <TurnControls game={game} cardRef={cardRef} />
        </div>
      )}
    </Screen>
  );
}
