import { describe, expect, it } from 'vitest';
import { createCryptoRandom, createSeededRandom, pickOne } from './random.js';

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

describe('createCryptoRandom', () => {
  it('returns integers from the whole [0, max) range', () => {
    const random = createCryptoRandom();
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      seen.add(random.nextInt(6));
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('does not repeat a fixed sequence between instances', () => {
    const draw = () => {
      const random = createCryptoRandom();
      return Array.from({ length: 20 }, () => random.nextInt(2 ** 32));
    };
    expect(draw()).not.toEqual(draw());
  });

  it('rejects an invalid max', () => {
    expect(() => createCryptoRandom().nextInt(0)).toThrow(RangeError);
  });
});

describe('pickOne', () => {
  it('returns an element of the list', () => {
    const random = createSeededRandom(5);
    const items = ['a', 'b', 'c'];
    const picks = new Set(Array.from({ length: 50 }, () => pickOne(items, random)));
    expect([...picks].sort()).toEqual(items);
  });

  it('rejects an empty list', () => {
    expect(() => pickOne([], createSeededRandom(5))).toThrow(RangeError);
  });
});
