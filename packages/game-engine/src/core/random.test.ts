import { describe, expect, it } from 'vitest';
import {
  createCryptoRandom,
  createRandomFromUint32Source,
  createSeededRandom,
  pickOne,
} from './random.js';

const MAX_UINT32 = 0xffffffff;

/** A uint32 source that replays `values` and counts how many were read. */
function scriptedSource(values: readonly number[]) {
  let reads = 0;
  return {
    next: () => {
      const value = values[reads];
      if (value === undefined) {
        throw new Error(`source read ${reads + 1} times, only ${values.length} values scripted`);
      }
      reads += 1;
      return value;
    },
    reads: () => reads,
  };
}

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

describe('createRandomFromUint32Source', () => {
  // 2^32 mod 3 = 1, so the accepted values are [0, 2^32 - 1) and 0xffffffff is the one rejected.
  it('rejects a value that would bias the result and reads the source again', () => {
    const source = scriptedSource([MAX_UINT32, 0xfffffffe]);

    const value = createRandomFromUint32Source(source.next).nextInt(3);

    expect(value).toBe(2);
    expect(source.reads()).toBe(2);
  });

  it('keeps reading until it gets a value below the limit', () => {
    const source = scriptedSource([MAX_UINT32, MAX_UINT32, MAX_UINT32, 7]);

    expect(createRandomFromUint32Source(source.next).nextInt(3)).toBe(1);
    expect(source.reads()).toBe(4);
  });

  it('accepts the largest value below the limit without reading again', () => {
    const source = scriptedSource([0xfffffffe]);

    expect(createRandomFromUint32Source(source.next).nextInt(3)).toBe(2);
    expect(source.reads()).toBe(1);
  });

  it('accepts every value when the range is a power of two, so nothing is rejected', () => {
    const source = scriptedSource([MAX_UINT32]);

    expect(createRandomFromUint32Source(source.next).nextInt(2 ** 32)).toBe(MAX_UINT32);
    expect(source.reads()).toBe(1);
  });

  it('maps a value to its remainder', () => {
    expect(createRandomFromUint32Source(scriptedSource([10]).next).nextInt(4)).toBe(2);
    expect(createRandomFromUint32Source(scriptedSource([MAX_UINT32]).next).nextInt(2)).toBe(1);
  });

  it('returns 0 for a range of 1', () => {
    expect(createRandomFromUint32Source(scriptedSource([MAX_UINT32]).next).nextInt(1)).toBe(0);
  });

  it('does not read the source for an invalid max', () => {
    const source = scriptedSource([1]);

    expect(() => createRandomFromUint32Source(source.next).nextInt(0)).toThrow(RangeError);
    expect(source.reads()).toBe(0);
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

  it.each([0, -1, 1.5, Number.NaN, 2 ** 32 + 1])('rejects a max of %s', (max) => {
    expect(() => createCryptoRandom().nextInt(max)).toThrow(RangeError);
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
