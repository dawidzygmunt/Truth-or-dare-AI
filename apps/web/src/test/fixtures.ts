import type { CatalogResponse, DeckCard, DeckResponse } from '@tod/contracts';

export const FREE_EDITION_SLUG = 'klasyczna';
export const PAID_EDITION_SLUG = 'spicy';

export const catalogFixture: CatalogResponse = {
  games: [
    {
      slug: 'truth-or-dare',
      name: 'Prawda czy wyzwanie',
      description: 'Klasyka imprez',
      engine: 'card_deck',
      editions: [
        {
          slug: FREE_EDITION_SLUG,
          name: 'Klasyczna',
          tier: 'free',
          locked: false,
          intensity: 1,
          ageRating: 18,
          platforms: ['web', 'android'],
          locale: 'pl',
        },
        {
          slug: PAID_EDITION_SLUG,
          name: 'Spicy',
          tier: 'paid',
          locked: true,
          intensity: 4,
          ageRating: 18,
          platforms: ['web'],
          locale: 'pl',
        },
      ],
    },
  ],
};

export const cardsFixture: readonly DeckCard[] = [
  { id: 'truth-1', kind: 'truth', template: '{player}, truth one', penaltyShots: 2 },
  { id: 'truth-2', kind: 'truth', template: '{player}, truth two', penaltyShots: 3 },
  { id: 'dare-1', kind: 'dare', template: '{player}, dare one', penaltyShots: 2 },
  { id: 'dare-2', kind: 'dare', template: '{player}, dare two', penaltyShots: 3 },
];

export const deckFixture: DeckResponse = {
  editionSlug: FREE_EDITION_SLUG,
  cards: [...cardsFixture],
};
