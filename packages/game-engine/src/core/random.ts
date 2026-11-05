// Web-standard global. Declared locally because the engine compiles without DOM or Node types;
// this emits nothing and shadows no runtime binding.
declare const crypto: { getRandomValues(array: Uint32Array): Uint32Array };

/** Source of randomness. Injected everywhere, and kept outside game state so state stays JSON. */
export interface Random {
  /** Returns a uniformly distributed integer from `[0, maxExclusive)`. */
  nextInt(maxExclusive: number): number;
}

const UINT32_RANGE = 2 ** 32;

/**
 * Builds a `Random` over a uint32 source, using rejection sampling to avoid modulo bias.
 * Exported for tests that script the source; deliberately not part of the package API.
 */
export function createRandomFromUint32Source(nextUint32: () => number): Random {
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

/** Production generator backed by the platform CSPRNG. Holds no state worth restoring. */
export function createCryptoRandom(): Random {
  const buffer = new Uint32Array(1);
  return createRandomFromUint32Source(() => {
    const [value = 0] = crypto.getRandomValues(buffer);
    return value;
  });
}

/** Returns a random element. Throws `RangeError` for an empty list, which is a programmer error. */
export function pickOne<T>(items: readonly T[], random: Random): T {
  return items[random.nextInt(items.length)] as T;
}

/** Deterministic generator (mulberry32) for tests. Its position is not serializable. */
export function createSeededRandom(seed: number): Random {
  let state = seed;
  return createRandomFromUint32Source(() => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return (mixed ^ (mixed >>> 14)) >>> 0;
  });
}
