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

// Written as escapes on purpose: the composed and decomposed forms look identical in an editor.
describe('createPlayerQueue with Unicode names', () => {
  const NFC_ZOE = 'Zo\u00e9';
  const NFD_ZOE = 'Zoe\u0301';

  it('stores names in NFC', () => {
    expect(queueOf([NFD_ZOE, 'Kuba']).players).toEqual([NFC_ZOE, 'Kuba']);
  });

  it.each([
    ['composed then decomposed', [NFC_ZOE, NFD_ZOE]],
    ['decomposed then composed', [NFD_ZOE, NFC_ZOE]],
    ['differing in case and normalization', ['ZO\u00c9', NFD_ZOE]],
    ['Polish letter written decomposed (s + acute)', ['Kasia', 'Ka\u015bia', 'Kas\u0301ia']],
    ['Polish letter written decomposed (Z + dot above)', ['\u017baneta', 'Z\u0307aneta']],
  ])('rejects duplicates across normalization forms: %s', (_label, names) => {
    expect(errorOf(createPlayerQueue(names))).toBeInstanceOf(DuplicatePlayerNameError);
  });

  it.each([
    ['zero width space', 'Ola\u200b'],
    ['zero width space inside', 'O\u200bla'],
    ['zero width joiner', 'Ola\u200d'],
    ['word joiner', '\u2060Ola'],
    ['soft hyphen', 'O\u00adla'],
    ['right-to-left override', '\u202eOla'],
    ['byte order mark inside', 'Ol\ufeffa'],
  ])('rejects a duplicate that differs only by an invisible character: %s', (_label, name) => {
    expect(errorOf(createPlayerQueue(['Ola', name]))).toBeInstanceOf(DuplicatePlayerNameError);
    expect(errorOf(createPlayerQueue([name, 'Ola']))).toBeInstanceOf(DuplicatePlayerNameError);
  });

  it('ignores an invisible character between a letter and its combining mark', () => {
    expect(errorOf(createPlayerQueue([NFC_ZOE, 'Zoe\u200b\u0301']))).toBeInstanceOf(
      DuplicatePlayerNameError,
    );
  });

  it.each([
    ['zero width space', '\u200b'],
    ['several zero width characters', '\u200b\u200c\u200d\u2060'],
    ['zero width space around a space', '\u200b \u200b'],
    ['soft hyphen', '\u00ad'],
    ['right-to-left override', '\u202e'],
    ['control character', '\u0007'],
    ['null character', '\u0000'],
    ['next line (control)', '\u0085'],
    ['em space', '\u2003'],
    ['no-break space', '\u00a0'],
    ['line separator', '\u2028'],
    ['mix of separators, controls and format characters', '\u00a0\u0007\u200b\u2003'],
  ])('rejects a name made only of invisible characters: %s', (_label, name) => {
    expect(errorOf(createPlayerQueue(['Ola', name]))).toBeInstanceOf(EmptyPlayerNameError);
  });

  it('keeps what the player typed apart from trimming and NFC', () => {
    const queue = queueOf(['  O\u200bla ', 'Kuba']);

    expect(queue.players).toEqual(['O\u200bla', 'Kuba']);
  });

  it('reports a duplicate under the name as typed (trimmed, NFC)', () => {
    expect(errorOf(createPlayerQueue(['Ola', 'Ola\u200b']))).toMatchObject({
      playerName: 'Ola\u200b',
    });
  });

  it('keeps accepting Polish names, including ones that differ only by a diacritic', () => {
    const names = [
      '\u0141ukasz',
      '\u017baneta',
      'B\u0142a\u017cej',
      '\u0104dam',
      'Zo\u015bka',
      'Zosia',
    ];

    expect(queueOf(names).players).toEqual(names);
    expect(queueOf(['Lukasz', '\u0141ukasz']).players).toEqual(['Lukasz', '\u0141ukasz']);
    expect(queueOf(['Zazolc', 'Za\u017c\u00f3\u0142\u0107']).players).toHaveLength(2);
  });

  it('treats names that differ only by a letter with a diacritic as different people', () => {
    expect(queueOf(['Ola', 'O\u0142a']).players).toEqual(['Ola', 'O\u0142a']);
    expect(queueOf(['\u017baneta', 'Zaneta']).players).toHaveLength(2);
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
