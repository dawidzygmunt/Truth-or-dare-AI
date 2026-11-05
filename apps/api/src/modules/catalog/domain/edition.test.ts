import { describe, expect, it } from 'vitest';
import { isEditionLocked, type Edition } from './edition.js';

describe('isEditionLocked', () => {
  it('leaves free editions open', () => {
    expect(isEditionLocked({ tier: 'free' })).toBe(false);
  });

  it('locks paid editions', () => {
    expect(isEditionLocked({ tier: 'paid' })).toBe(true);
  });

  it('fails closed for a tier it does not know, e.g. one added to the database first', () => {
    const unknown = { tier: 'bundle' } as unknown as Pick<Edition, 'tier'>;

    expect(isEditionLocked(unknown)).toBe(true);
  });
});
