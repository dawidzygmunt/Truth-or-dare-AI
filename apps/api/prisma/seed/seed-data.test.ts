import { describe, expect, it } from 'vitest';
import { SeedCardSchema, SeedGameSchema, type SeedCard } from './seed-data.schema.js';
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

  it('never tells anyone to drink: penalties belong to the penalty mode', () => {
    const drinking = /\b(pij|wypij|upij|shot|kieliszek|duszkiem|alkohol|wódk|piw[oa])/iu;

    expect(cards.filter(({ template }) => drinking.test(template))).toEqual([]);
  });
});
