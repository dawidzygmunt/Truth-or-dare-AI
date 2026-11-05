import { describe, expect, it } from 'vitest';
import { DeckResponseSchema, type DeckCard, type DeckResponse } from '../index.js';

const card: DeckCard = {
  id: 'card-1',
  kind: 'truth',
  template: '{player}, co ostatnio Cię rozśmieszyło?',
  penaltyShots: null,
};

const deck: DeckResponse = { editionSlug: 'truth-or-dare-klasyczna', cards: [card] };

describe('DeckResponseSchema', () => {
  it('accepts cards without a penalty', () => {
    expect(DeckResponseSchema.parse(deck)).toEqual(deck);
  });

  it('accepts cards with a penalty', () => {
    const withPenalty = { ...deck, cards: [{ ...card, penaltyShots: 2 }] };

    expect(DeckResponseSchema.parse(withPenalty)).toEqual(withPenalty);
  });

  it.each(['truth', 'dare', 'statement', 'challenge'])('accepts the %s kind', (kind) => {
    expect(DeckResponseSchema.safeParse({ ...deck, cards: [{ ...card, kind }] }).success).toBe(
      true,
    );
  });

  it('rejects an unknown card kind', () => {
    const invalid = { ...deck, cards: [{ ...card, kind: 'joke' }] };

    expect(DeckResponseSchema.safeParse(invalid).success).toBe(false);
  });

  it('requires penaltyShots to be present, not just optional', () => {
    const { penaltyShots: _omitted, ...withoutPenalty } = card;

    expect(DeckResponseSchema.safeParse({ ...deck, cards: [withoutPenalty] }).success).toBe(false);
  });

  it('rejects a non-positive penalty', () => {
    const invalid = { ...deck, cards: [{ ...card, penaltyShots: 0 }] };

    expect(DeckResponseSchema.safeParse(invalid).success).toBe(false);
  });
});
