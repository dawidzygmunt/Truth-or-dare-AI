import { describe, expect, it } from 'vitest';
import { CatalogResponseSchema, type CatalogResponse } from '../index.js';

const catalog: CatalogResponse = {
  games: [
    {
      slug: 'truth-or-dare',
      name: 'Prawda czy wyzwanie',
      description: 'Klasyk na każdą imprezę',
      engine: 'card_deck',
      editions: [
        {
          slug: 'truth-or-dare-klasyczna',
          name: 'Klasyczna',
          tier: 'free',
          locked: false,
          intensity: 1,
          ageRating: 18,
          platforms: ['web', 'android'],
          locale: 'pl',
        },
      ],
    },
  ],
};

function withEdition(patch: Record<string, unknown>): unknown {
  const [game] = catalog.games;
  const [edition] = game?.editions ?? [];
  return { games: [{ ...game, editions: [{ ...edition, ...patch }] }] };
}

describe('CatalogResponseSchema', () => {
  it('accepts games with their editions', () => {
    expect(CatalogResponseSchema.parse(catalog)).toEqual(catalog);
  });

  it('accepts an empty catalog', () => {
    expect(CatalogResponseSchema.parse({ games: [] })).toEqual({ games: [] });
  });

  it('rejects an unknown tier', () => {
    expect(CatalogResponseSchema.safeParse(withEdition({ tier: 'gold' })).success).toBe(false);
  });

  it('rejects an unknown platform', () => {
    expect(CatalogResponseSchema.safeParse(withEdition({ platforms: ['ios'] })).success).toBe(
      false,
    );
  });

  it('requires the locked flag', () => {
    expect(CatalogResponseSchema.safeParse(withEdition({ locked: undefined })).success).toBe(false);
  });

  it('never carries cards, even if the server sent them', () => {
    const parsed = CatalogResponseSchema.parse(withEdition({ cards: [{ id: 'leak' }] }));

    expect(parsed.games[0]?.editions[0]).not.toHaveProperty('cards');
  });
});
