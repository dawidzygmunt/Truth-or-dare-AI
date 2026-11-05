import type { Card } from '../../src/modules/catalog/domain/card.js';
import type { Edition } from '../../src/modules/catalog/domain/edition.js';
import type { GameWithEditions } from '../../src/modules/catalog/domain/game.js';

let nextId = 0;

function uniqueId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

export function aGame(overrides: Partial<GameWithEditions> = {}): GameWithEditions {
  const id = uniqueId('game');
  return {
    id,
    slug: id,
    name: `Game ${id}`,
    engine: 'card_deck',
    description: 'Description',
    editions: [],
    ...overrides,
  };
}

export function anEdition(overrides: Partial<Edition> = {}): Edition {
  const id = uniqueId('edition');
  return {
    id,
    slug: id,
    name: `Edition ${id}`,
    tier: 'free',
    productId: null,
    intensity: 1,
    ageRating: 18,
    platforms: ['web', 'android'],
    locale: 'pl',
    isPublished: true,
    ...overrides,
  };
}

export function aCard(overrides: Partial<Card> = {}): Card {
  return {
    id: uniqueId('card'),
    kind: 'truth',
    template: '{player}, opowiedz coś o sobie.',
    tags: [],
    intensity: 1,
    penaltyShots: null,
    ...overrides,
  };
}
