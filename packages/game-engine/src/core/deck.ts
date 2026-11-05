import type { Random } from './random.js';

export type CardKind = 'truth' | 'dare' | 'statement' | 'challenge';

/**
 * Card as provided by the caller. Structurally compatible with the API response, which the engine
 * must not import. `undefined` is spelled out for `exactOptionalPropertyTypes`.
 */
export interface Card {
  readonly id: string;
  readonly kind: CardKind;
  readonly template: string;
  readonly penaltyShots?: number | null | undefined;
}

/** Card inside a deck: serializable, with an absent penalty normalized to `null`. */
export interface DeckCard {
  readonly id: string;
  readonly kind: CardKind;
  readonly template: string;
  readonly penaltyShots: number | null;
}

/** Cards of one kind in shuffled order. Everything before `nextIndex` was already drawn. */
export interface Pile {
  readonly cards: readonly DeckCard[];
  readonly nextIndex: number;
}

export type Deck = Readonly<Record<CardKind, Pile>>;

export interface DrawnCard {
  readonly card: DeckCard;
  readonly deck: Deck;
}

export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const pool = [...items];
  const shuffled: T[] = [];
  while (pool.length > 0) {
    shuffled.push(...pool.splice(random.nextInt(pool.length), 1));
  }
  return shuffled;
}

export function createDeck(cards: readonly Card[], random: Random): Deck {
  const normalized = cards.map(({ id, kind, template, penaltyShots }) => ({
    id,
    kind,
    template,
    penaltyShots: penaltyShots ?? null,
  }));
  const pileOf = (kind: CardKind): Pile => ({
    cards: shuffle(
      normalized.filter((card) => card.kind === kind),
      random,
    ),
    nextIndex: 0,
  });
  return {
    truth: pileOf('truth'),
    dare: pileOf('dare'),
    statement: pileOf('statement'),
    challenge: pileOf('challenge'),
  };
}

/**
 * Draws the next card of a kind, reshuffling only that kind once it is exhausted.
 * Returns `null` when the deck never had a card of that kind.
 */
export function drawCard(deck: Deck, kind: CardKind, random: Random): DrawnCard | null {
  const pile = deck[kind];
  const isExhausted = pile.nextIndex >= pile.cards.length;
  const cards = isExhausted ? shuffle(pile.cards, random) : pile.cards;
  const nextIndex = isExhausted ? 0 : pile.nextIndex;
  const card = cards[nextIndex];
  if (card === undefined) {
    return null;
  }
  return { card, deck: { ...deck, [kind]: { cards, nextIndex: nextIndex + 1 } } };
}
