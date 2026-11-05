import { describe, expect, it } from 'vitest';
import {
  DuplicatePlayerNameError,
  EmptyPlayerNameError,
  TooFewPlayersError,
  type GameError,
} from './errors.js';
import { createPlayerQueue, neighboursOf, takeTurn, type PlayerQueue } from './player-queue.js';

function queueOf(names: readonly string[]): PlayerQueue {
  const result = createPlayerQueue(names);
  if (!result.ok) {
    throw result.error;
  }
  return result.value;
}

function errorOf(result: ReturnType<typeof createPlayerQueue>): GameError {
  if (result.ok) {
    throw new Error('expected a failed result');
  }
  return result.error;
}

function turns(start: PlayerQueue, count: number): string[] {
  let queue = start;
  const players: string[] = [];
  for (let i = 0; i < count; i++) {
    const turn = takeTurn(queue);
    players.push(turn.player);
    queue = turn.queue;
  }
  return players;
}

describe('takeTurn', () => {
  it('rotates in the order players were added and wraps after the last one', () => {
    expect(turns(queueOf(['Ola', 'Kuba', 'Ania']), 7)).toEqual([
      'Ola',
      'Kuba',
      'Ania',
      'Ola',
      'Kuba',
      'Ania',
      'Ola',
    ]);
  });

  it('does not mutate the queue', () => {
    const queue = Object.freeze(queueOf(['Ola', 'Kuba']));
    expect(takeTurn(queue).player).toBe('Ola');
    expect(takeTurn(queue).player).toBe('Ola');
  });
});

describe('createPlayerQueue', () => {
  it('trims names', () => {
    expect(queueOf(['  Ola ', '\tKuba\n']).players).toEqual(['Ola', 'Kuba']);
  });

  it.each([[[]], [['Ola']]])('rejects fewer than two players: %j', (names) => {
    expect(errorOf(createPlayerQueue(names))).toBeInstanceOf(TooFewPlayersError);
  });

  it.each([[['Ola', '']], [['Ola', '   ']]])('rejects an empty name: %j', (names) => {
    expect(errorOf(createPlayerQueue(names))).toBeInstanceOf(EmptyPlayerNameError);
  });

  it('does not count blank names towards the minimum', () => {
    expect(errorOf(createPlayerQueue(['', '  ']))).toBeInstanceOf(EmptyPlayerNameError);
  });

  it.each([
    [['Ola', 'Ola']],
    [['Ola', 'OLA']],
    [['Ola', ' ola ']],
    [['Łukasz', 'łukasz']],
    [['Żaneta', 'ŻANETA']],
  ])('rejects duplicates ignoring case: %j', (names) => {
    expect(errorOf(createPlayerQueue(names))).toBeInstanceOf(DuplicatePlayerNameError);
  });

  it('reports which name is a duplicate', () => {
    expect(errorOf(createPlayerQueue(['Ola', 'Kuba', ' kuba']))).toMatchObject({
      playerName: 'kuba',
    });
  });
});

describe('neighboursOf', () => {
  const queue = queueOf(['Ola', 'Kuba', 'Ania']);

  it('returns the previous player as left and the next one as right', () => {
    expect(neighboursOf(queue.players, 'Kuba')).toEqual({ left: 'Ola', right: 'Ania' });
  });

  it('wraps around both ends', () => {
    expect(neighboursOf(queue.players, 'Ola')).toEqual({ left: 'Ania', right: 'Kuba' });
    expect(neighboursOf(queue.players, 'Ania')).toEqual({ left: 'Kuba', right: 'Ola' });
  });

  it('gives the same neighbour on both sides with two players', () => {
    expect(neighboursOf(['Ola', 'Kuba'], 'Ola')).toEqual({ left: 'Kuba', right: 'Kuba' });
  });
});
