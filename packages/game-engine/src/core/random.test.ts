import { describe, expect, it } from 'vitest';
import { createSeededRandom } from './random.js';

function sequence(seed: number, length: number): number[] {
  const random = createSeededRandom(seed);
  return Array.from({ length }, () => random.nextInt(1000));
}

describe('createSeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    expect(sequence(42, 20)).toEqual(sequence(42, 20));
  });

  it('produces different sequences for different seeds', () => {
    expect(sequence(42, 20)).not.toEqual(sequence(43, 20));
  });

  it('returns integers from the whole [0, max) range', () => {
    const random = createSeededRandom(1);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      seen.add(random.nextInt(6));
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it.each([0, -1, 1.5, Number.NaN, 2 ** 32 + 1])('rejects a max of %s', (max) => {
    expect(() => createSeededRandom(1).nextInt(max)).toThrow(RangeError);
  });
});
