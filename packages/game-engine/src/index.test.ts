import { describe, expect, it } from 'vitest';
import { ENGINE_VERSION } from './index.js';

describe('game-engine', () => {
  it('exposes its version', () => {
    expect(ENGINE_VERSION).toBe('0.0.0');
  });
});
