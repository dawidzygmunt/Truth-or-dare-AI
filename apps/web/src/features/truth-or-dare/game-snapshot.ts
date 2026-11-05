import { DeckCardSchema } from '@tod/contracts';
import type { TruthOrDareState } from '@tod/game-engine';
import { z } from 'zod';

/** Bump when `TruthOrDareState` changes shape. Older snapshots then start a fresh game. */
export const SNAPSHOT_VERSION = 1;

const IndexSchema = z.number().int().nonnegative();
const PlayerNameSchema = z.string().min(1);
const PileSchema = z.object({ cards: z.array(DeckCardSchema), nextIndex: IndexSchema });

const sharedShape = {
  penaltyMode: z.enum(['shots', 'none']),
  queue: z.object({ players: z.array(PlayerNameSchema).min(2), nextIndex: IndexSchema }),
  deck: z.object({
    truth: PileSchema,
    dare: PileSchema,
    statement: PileSchema,
    challenge: PileSchema,
  }),
};

/**
 * The reducer trusts its input and would throw on damaged data, so restored state is checked first.
 * Typed against the engine state: when that changes, this stops compiling.
 */
const TruthOrDareStateSchema: z.ZodType<TruthOrDareState> = z.discriminatedUnion('phase', [
  z.object({
    ...sharedShape,
    phase: z.literal('awaitingTurn'),
    currentPlayer: PlayerNameSchema.nullable(),
    currentCard: z.null(),
    penalty: z.object({ player: PlayerNameSchema, shots: z.number().int().positive() }).nullable(),
  }),
  z.object({
    ...sharedShape,
    phase: z.literal('choosing'),
    currentPlayer: PlayerNameSchema,
    currentCard: z.null(),
    penalty: z.null(),
  }),
  z.object({
    ...sharedShape,
    phase: z.literal('cardDrawn'),
    currentPlayer: PlayerNameSchema,
    currentCard: z.object({
      id: z.string().min(1),
      kind: z.enum(['truth', 'dare']),
      text: z.string(),
      penaltyShots: z.number().int().positive().nullable(),
    }),
    penalty: z.null(),
  }),
]);

const SnapshotSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  game: TruthOrDareStateSchema,
});

export type GameSnapshot = z.infer<typeof SnapshotSchema>;

export function createSnapshot(game: TruthOrDareState): GameSnapshot {
  return { version: SNAPSHOT_VERSION, game };
}

/** Returns the stored game, or `null` when it is missing, outdated or unreadable. */
export function readSnapshot(stored: unknown): TruthOrDareState | null {
  const parsed = SnapshotSchema.safeParse(stored);
  return parsed.success ? parsed.data.game : null;
}
