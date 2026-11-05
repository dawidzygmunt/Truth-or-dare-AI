import type { TruthOrDareState } from '@tod/game-engine';
import {
  selectCurrentCard,
  selectCurrentPlayer,
  selectPenalty,
  selectPhase,
} from '@tod/game-engine';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { pl } from '../../i18n/pl.js';
import { Button, textActionClasses } from '../../shared/ui/button.js';
import { ConfirmPanel } from '../../shared/ui/confirm-panel.js';
import { LoadingMessage } from '../../shared/ui/loading-message.js';
import { Screen } from '../../shared/ui/screen.js';
import { useGameStore } from './game-store-context.js';

function TurnControls({ game }: { readonly game: TruthOrDareState }) {
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
        <section className="flex flex-col gap-2 rounded-xl border border-neutral-600 p-4">
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
          <TurnControls game={game} />
        </div>
      )}
    </Screen>
  );
}
