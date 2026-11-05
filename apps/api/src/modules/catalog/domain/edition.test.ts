import { describe, expect, it } from 'vitest';
import { isEditionLocked } from './edition.js';

describe('isEditionLocked', () => {
  it('leaves free editions open', () => {
    expect(isEditionLocked({ tier: 'free' })).toBe(false);
  });

  it('locks paid editions', () => {
    expect(isEditionLocked({ tier: 'paid' })).toBe(true);
  });
});
