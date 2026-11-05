import { describe, expect, it } from 'vitest';
import { createDeck, drawCard, shuffle, type Card, type CardKind, type Deck } from './deck.js';
import { createSeededRandom, type Random } from './random.js';

function cardsOf(kind: CardKind, count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${kind}-${i}`,
    kind,
    template: `${kind} ${i}`,
  }));
}

function drawIds(start: Deck, kind: CardKind, count: number, random: Random) {
  let deck = start;
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const drawn = drawCard(deck, kind, random);
    if (drawn === null) {
      throw new Error(`no ${kind} card to draw`);
    }
    ids.push(drawn.card.id);
    deck = drawn.deck;
  }
  return { ids, deck };
}

describe('shuffle', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);

  it('returns a permutation of the input', () => {
    const shuffled = shuffle(items, createSeededRandom(1));
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
  });

  it('changes the order', () => {
    expect(shuffle(items, createSeededRandom(1))).not.toEqual(items);
  });

  it('is deterministic for a seed and differs between seeds', () => {
    const first = shuffle(items, createSeededRandom(1));
    expect(shuffle(items, createSeededRandom(1))).toEqual(first);
    expect(shuffle(items, createSeededRandom(2))).not.toEqual(first);
  });

  it('does not mutate the input', () => {
    const input = Object.freeze([...items]);
    expect(() => shuffle(input, createSeededRandom(1))).not.toThrow();
  });

  it('produces every permutation of three items about equally often', () => {
    const trials = 6000;
    const expected = trials / 6;
    // Binomial sigma is about 29, so 150 is over five sigma: wide enough for any fair shuffle,
    // narrow enough to catch a biased or partly fixed one (a stuck first element gives 3000 or 0).
    const tolerance = 150;
    const random = createSeededRandom(1);
    const counts = new Map<string, number>();

    for (let trial = 0; trial < trials; trial++) {
      const permutation = shuffle([0, 1, 2], random).join('');
      counts.set(permutation, (counts.get(permutation) ?? 0) + 1);
    }

    expect([...counts.keys()].sort()).toEqual(['012', '021', '102', '120', '201', '210']);
    for (const count of counts.values()) {
      expect(Math.abs(count - expected)).toBeLessThan(tolerance);
    }
  });
});

describe('drawCard', () => {
  it('draws every card of a kind exactly once before repeating', () => {
    const random = createSeededRandom(3);
    const truths = cardsOf('truth', 10);
    const deck = createDeck([...truths, ...cardsOf('dare', 3)], random);

    const { ids } = drawIds(deck, 'truth', 10, random);

    expect([...ids].sort()).toEqual(truths.map((card) => card.id).sort());
  });

  it('shuffles cards at creation', () => {
    const random = createSeededRandom(3);
    const truths = cardsOf('truth', 10);

    const { ids } = drawIds(createDeck(truths, random), 'truth', 10, random);

    expect(ids).not.toEqual(truths.map((card) => card.id));
  });

  it('only draws cards of the requested kind', () => {
    const random = createSeededRandom(3);
    const deck = createDeck([...cardsOf('truth', 5), ...cardsOf('dare', 5)], random);

    const { ids } = drawIds(deck, 'dare', 5, random);

    expect(ids.every((id) => id.startsWith('dare-'))).toBe(true);
  });

  it('does not mutate the deck', () => {
    const random = createSeededRandom(3);
    const deck = createDeck(cardsOf('truth', 3), random);
    const snapshot = structuredClone(deck);

    drawCard(deck, 'truth', random);

    expect(deck).toEqual(snapshot);
  });

  it('returns null when the deck has no cards of a kind', () => {
    const random = createSeededRandom(3);
    expect(drawCard(createDeck(cardsOf('truth', 3), random), 'dare', random)).toBeNull();
  });
});

describe('drawCard after a kind is exhausted', () => {
  it('starts a new full cycle of that kind in a different order', () => {
    const random = createSeededRandom(3);
    const start = createDeck(cardsOf('truth', 10), random);

    const first = drawIds(start, 'truth', 10, random);
    const second = drawIds(first.deck, 'truth', 10, random);

    expect([...second.ids].sort()).toEqual([...first.ids].sort());
    expect(second.ids).not.toEqual(first.ids);
  });

  it('leaves the piles of other kinds untouched', () => {
    const random = createSeededRandom(3);
    const start = createDeck([...cardsOf('truth', 2), ...cardsOf('dare', 5)], random);
    const dareDrawn = drawIds(start, 'dare', 3, random);

    const { deck } = drawIds(dareDrawn.deck, 'truth', 3, random);

    expect(deck.dare).toBe(dareDrawn.deck.dare);
  });

  it('keeps serving the only card of a kind', () => {
    const random = createSeededRandom(3);
    const start = createDeck(cardsOf('truth', 1), random);

    expect(drawIds(start, 'truth', 3, random).ids).toEqual(['truth-0', 'truth-0', 'truth-0']);
  });
});

describe('createDeck', () => {
  it('normalizes a missing penalty to null so the deck survives a JSON round trip', () => {
    const random = createSeededRandom(3);
    const deck = createDeck(
      [
        { id: 'a', kind: 'truth', template: 'a' },
        { id: 'b', kind: 'truth', template: 'b', penaltyShots: undefined },
        { id: 'c', kind: 'truth', template: 'c', penaltyShots: null },
      ],
      random,
    );

    expect(JSON.parse(JSON.stringify(deck))).toStrictEqual(deck);
  });

  it('keeps a penalty of a card', () => {
    const random = createSeededRandom(3);
    const deck = createDeck([{ id: 'a', kind: 'truth', template: 'a', penaltyShots: 2 }], random);

    expect(drawCard(deck, 'truth', random)?.card.penaltyShots).toBe(2);
  });
});
