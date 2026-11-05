import { describe, expect, it } from 'vitest';
import {
  SeedCardSchema,
  SeedEditionSchema,
  SeedGameSchema,
  type SeedCard,
  type SeedEdition,
  type SeedGame,
} from './seed-data.schema.js';
import truthOrDare from './truth-or-dare.json' with { type: 'json' };

const validCard: SeedCard = {
  id: 'card-1',
  kind: 'truth',
  template: '{player}, co Cię ostatnio rozśmieszyło?',
  tags: [],
  intensity: 1,
  penaltyShots: null,
};

describe('SeedCardSchema', () => {
  it.each(['{player}', '{randomPlayer}', '{playerLeft}', '{playerRight}'])(
    'accepts the %s placeholder',
    (placeholder) => {
      const card = { ...validCard, template: `${placeholder}, opowiedz coś.` };

      expect(SeedCardSchema.safeParse(card).success).toBe(true);
    },
  );

  it('rejects an unknown placeholder', () => {
    const card = { ...validCard, template: '{player}, zapytaj {hostPlayer}.' };

    expect(SeedCardSchema.safeParse(card).success).toBe(false);
  });

  it('rejects a misspelled placeholder casing', () => {
    const card = { ...validCard, template: '{Player}, opowiedz coś.' };

    expect(SeedCardSchema.safeParse(card).success).toBe(false);
  });

  it('defaults a missing penalty to null', () => {
    const card: Partial<SeedCard> = { ...validCard };
    delete card.penaltyShots;

    expect(SeedCardSchema.parse(card).penaltyShots).toBeNull();
  });

  it('rejects a zero or fractional penalty', () => {
    expect(SeedCardSchema.safeParse({ ...validCard, penaltyShots: 0 }).success).toBe(false);
    expect(SeedCardSchema.safeParse({ ...validCard, penaltyShots: 1.5 }).success).toBe(false);
  });

  it.each([
    ['an unclosed brace', '{player}, co { się stało?'],
    ['a lone closing brace', '{player}, co } się stało?'],
    ['an unclosed placeholder', '{player, co się stało?'],
    ['a doubled brace', '{{player}}, co się stało?'],
    ['an empty placeholder', '{player}, co {} się stało?'],
  ])('rejects %s', (_, template) => {
    expect(SeedCardSchema.safeParse({ ...validCard, template }).success).toBe(false);
  });

  it('rejects an unknown field, e.g. a misspelled penaltyShots', () => {
    expect(SeedCardSchema.safeParse({ ...validCard, penaltyShot: 2 }).success).toBe(false);
  });
});

const validEdition: SeedEdition = {
  slug: 'edition-1',
  name: 'Edycja',
  tier: 'free',
  productId: null,
  intensity: 1,
  ageRating: 18,
  platforms: ['web'],
  locale: 'pl',
  isPublished: true,
  cards: [validCard],
};

const validGame: SeedGame = {
  slug: 'game-1',
  name: 'Gra',
  description: 'Opis',
  engine: 'card_deck',
  editions: [validEdition],
};

describe('SeedEditionSchema', () => {
  it('accepts a valid free edition', () => {
    expect(SeedEditionSchema.safeParse(validEdition).success).toBe(true);
  });

  it('rejects a published edition without cards, which would wipe it on seed', () => {
    expect(SeedEditionSchema.safeParse({ ...validEdition, cards: [] }).success).toBe(false);
  });

  it('accepts an unpublished draft without cards', () => {
    const draft = { ...validEdition, isPublished: false, cards: [] };

    expect(SeedEditionSchema.safeParse(draft).success).toBe(true);
  });

  it('rejects a paid edition without a productId', () => {
    const paid = { ...validEdition, tier: 'paid', productId: null };

    expect(SeedEditionSchema.safeParse(paid).success).toBe(false);
  });

  it('accepts a paid edition with a productId', () => {
    const paid = { ...validEdition, tier: 'paid', productId: 'prod_spicy' };

    expect(SeedEditionSchema.safeParse(paid).success).toBe(true);
  });

  it('rejects a slug the deck endpoint could never serve', () => {
    const edition = { ...validEdition, slug: 'Edycja Klasyczna' };

    expect(SeedEditionSchema.safeParse(edition).success).toBe(false);
  });

  it('rejects an unknown field, e.g. a misspelled isPublished', () => {
    expect(SeedEditionSchema.safeParse({ ...validEdition, isPublish: true }).success).toBe(false);
  });
});

describe('SeedGameSchema', () => {
  it('accepts a valid game', () => {
    expect(SeedGameSchema.safeParse(validGame).success).toBe(true);
  });

  it('rejects an unknown field', () => {
    expect(SeedGameSchema.safeParse({ ...validGame, engines: 'card_deck' }).success).toBe(false);
  });

  it('rejects a card id reused in another edition of the game', () => {
    const other: SeedEdition = { ...validEdition, slug: 'edition-2', cards: [validCard] };
    const game = { ...validGame, editions: [validEdition, other] };

    expect(SeedGameSchema.safeParse(game).success).toBe(false);
  });

  it('rejects a card id repeated inside one edition', () => {
    const edition: SeedEdition = { ...validEdition, cards: [validCard, validCard] };

    expect(SeedGameSchema.safeParse({ ...validGame, editions: [edition] }).success).toBe(false);
  });

  it('accepts distinct card ids across editions', () => {
    const other: SeedEdition = {
      ...validEdition,
      slug: 'edition-2',
      cards: [{ ...validCard, id: 'card-2' }],
    };

    expect(
      SeedGameSchema.safeParse({ ...validGame, editions: [validEdition, other] }).success,
    ).toBe(true);
  });
});

// Polish drinking vocabulary as word prefixes, so inflections are caught (kieliszek, kieliszka,
// kieliszkiem). "pij" also catches "pijany". The unicode lookbehind replaces \b, which does not
// treat letters like "ó" or "ł" as word characters.
const DRINKING_PREFIXES = [
  'pij',
  'pić',
  'picie',
  'wypij',
  'wypić',
  'upij',
  'upić',
  'napij',
  'napić',
  'popij',
  'zapij',
  'dopij',
  'nalej',
  'nalać',
  'wychyl',
  'kielisz',
  'duszk',
  'shot',
  'drink',
  'alkohol',
  'wódk',
  'browar',
  'whisky',
];
// Short stems that would be too noisy as prefixes (winogrono, piwnica, wina = guilt).
const DRINKING_WORDS = ['piw(?:o|a|u|em|ie)', 'win(?:o|em)'];
const DRINKING = new RegExp(
  String.raw`(?<!\p{L})(?:(?:${DRINKING_PREFIXES.join('|')})|(?:${DRINKING_WORDS.join('|')})(?!\p{L}))`,
  'iu',
);

/**
 * A heuristic over the word list above, not a proof: synonyms, slang and forms outside the list
 * pass, so new cards still need a human check for the Google Play drinking rules.
 */
function mentionsDrinking(text: string): boolean {
  return DRINKING.test(text);
}

describe('mentionsDrinking', () => {
  it.each([
    'Napij się.',
    'Wypij łyk.',
    'Pijemy razem.',
    'Pić do dna.',
    'Wypić kieliszek.',
    'Weź kieliszka.',
    'Z kieliszkiem w ręku.',
    'Nalej sobie.',
    'Nalać wszystkim.',
    'Zamów piwo.',
    'Polej piwem.',
    'Kupił wino.',
    'Pijesz z winem.',
    'Zrób shota.',
    'Wódka.',
    'Duszkiem!',
    'Pijany jak bela.',
    'Zamów drinka.',
  ])('detects a drinking word in "%s"', (text) => {
    expect(mentionsDrinking(text)).toBe(true);
  });

  it.each([
    'Czyja to wina?',
    'Zejdź do piwnicy.',
    'Policz do pięciu.',
    'Opowiedz o pilocie.',
    'Narysuj piękny obraz.',
    'Zrób piruet.',
  ])('does not flag "%s"', (text) => {
    expect(mentionsDrinking(text)).toBe(false);
  });
});

describe('truth-or-dare seed data', () => {
  const game = SeedGameSchema.parse(truthOrDare);
  const edition = game.editions.find(({ name }) => name === 'Klasyczna');
  const cards = edition?.cards ?? [];

  it('describes the truth-or-dare game on the card deck engine', () => {
    expect(game).toMatchObject({ slug: 'truth-or-dare', engine: 'card_deck' });
  });

  it('has a free, published Klasyczna edition available on android', () => {
    expect(edition).toMatchObject({ tier: 'free', isPublished: true, locale: 'pl' });
    expect(edition?.platforms).toContain('android');
  });

  it('has about 30 truths and 30 dares', () => {
    expect(cards.filter(({ kind }) => kind === 'truth').length).toBeGreaterThanOrEqual(30);
    expect(cards.filter(({ kind }) => kind === 'dare').length).toBeGreaterThanOrEqual(30);
  });

  it('has only truths and dares', () => {
    expect(new Set(cards.map(({ kind }) => kind))).toEqual(new Set(['truth', 'dare']));
  });

  it('has unique, stable card ids', () => {
    const ids = cards.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique templates', () => {
    const templates = cards.map(({ template }) => template);

    expect(new Set(templates).size).toBe(templates.length);
  });

  it('gives some, but not all, cards a penalty', () => {
    const withPenalty = cards.filter(({ penaltyShots }) => penaltyShots !== null);

    expect(withPenalty.length).toBeGreaterThan(0);
    expect(withPenalty.length).toBeLessThan(cards.length);
  });

  it('addresses the current player on every card', () => {
    expect(cards.filter(({ template }) => !template.includes('{player}'))).toEqual([]);
  });

  it('uses every neighbour and random placeholder at least once', () => {
    const templates = cards.map(({ template }) => template).join(' ');

    expect(templates).toContain('{randomPlayer}');
    expect(templates).toContain('{playerLeft}');
    expect(templates).toContain('{playerRight}');
  });

  it('uses none of the drinking words listed above: penalties belong to the penalty mode', () => {
    expect(cards.filter(({ template }) => mentionsDrinking(template))).toEqual([]);
  });
});
