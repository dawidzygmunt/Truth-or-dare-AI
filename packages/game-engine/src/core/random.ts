/** Source of randomness. Injected everywhere, and kept outside game state so state stays JSON. */
export interface Random {
  /** Returns a uniformly distributed integer from `[0, maxExclusive)`. */
  nextInt(maxExclusive: number): number;
}

const UINT32_RANGE = 2 ** 32;

/** Builds a `Random` over a uint32 source, using rejection sampling to avoid modulo bias. */
function fromUint32Source(nextUint32: () => number): Random {
  return {
    nextInt(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) {
        throw new RangeError(`maxExclusive must be an integer in [1, 2^32], got ${maxExclusive}`);
      }
      const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
      let value = nextUint32();
      while (value >= limit) {
        value = nextUint32();
      }
      return value % maxExclusive;
    },
  };
}

/** Deterministic generator (mulberry32) for tests. Its position is not serializable. */
export function createSeededRandom(seed: number): Random {
  let state = seed;
  return fromUint32Source(() => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return (mixed ^ (mixed >>> 14)) >>> 0;
  });
}
