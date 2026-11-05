import { CatalogResponseSchema, DeckResponseSchema } from '@tod/contracts';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SeedGameSchema } from '../prisma/seed/seed-data.schema.js';
import { seedGame } from '../prisma/seed/seed-game.js';
import truthOrDare from '../prisma/seed/truth-or-dare.json' with { type: 'json' };
import { AppModule } from '../src/app.module.js';
import { aCard, aGame, anEdition } from './support/catalog-fixtures.js';
import {
  insertCards,
  insertGame,
  startTestDatabase,
  type TestDatabase,
} from './support/test-database.js';

const FREE_SLUG = 'truth-or-dare-klasyczna';
const PAID_CARD_ID = 'paid-card-id-sentinel';
const PAID_CARD_TEMPLATE = '{player}, paid card content sentinel';
const DRAFT_CARD_TEMPLATE = '{player}, draft card content sentinel';

describe('catalog api', () => {
  let database: TestDatabase;
  let app: INestApplication<App>;

  beforeAll(async () => {
    database = await startTestDatabase();
    process.env.DATABASE_URL = database.url;

    await seedGame(database.prisma, SeedGameSchema.parse(truthOrDare));

    const paid = anEdition({ slug: 'paid-edition', name: 'Spicy', tier: 'paid' });
    const draft = anEdition({ slug: 'draft-edition', name: 'Draft', isPublished: false });
    await insertGame(
      database.prisma,
      aGame({ slug: 'paid-game', name: 'Paid game', editions: [paid, draft] }),
    );
    await insertCards(database.prisma, paid, [
      aCard({ id: PAID_CARD_ID, template: PAID_CARD_TEMPLATE, penaltyShots: 3 }),
    ]);
    await insertCards(database.prisma, draft, [aCard({ template: DRAFT_CARD_TEMPLATE })]);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await database.stop();
  });

  describe('GET /catalog', () => {
    it('returns games with published editions and the locked flag', async () => {
      const response = await request(app.getHttpServer()).get('/catalog').expect(200);

      const { games } = CatalogResponseSchema.parse(response.body);
      const editions = games.flatMap((game) => game.editions);

      expect(editions.map(({ slug, locked }) => ({ slug, locked }))).toEqual(
        expect.arrayContaining([
          { slug: FREE_SLUG, locked: false },
          { slug: 'paid-edition', locked: true },
        ]),
      );
    });

    it('does not list unpublished editions', async () => {
      const response = await request(app.getHttpServer()).get('/catalog').expect(200);

      expect(response.text).not.toContain('draft-edition');
    });

    it('contains no cards at all', async () => {
      const response = await request(app.getHttpServer()).get('/catalog').expect(200);

      expect(response.text).not.toContain('"cards"');
      expect(response.text).not.toContain('"template"');
      expect(response.text).not.toContain(PAID_CARD_TEMPLATE);
      expect(response.text).not.toContain(PAID_CARD_ID);
    });
  });

  describe('GET /editions/:slug/deck', () => {
    it('returns the whole deck of a free edition', async () => {
      const response = await request(app.getHttpServer())
        .get(`/editions/${FREE_SLUG}/deck`)
        .expect(200);

      const deck = DeckResponseSchema.parse(response.body);

      expect(deck.editionSlug).toBe(FREE_SLUG);
      expect(deck.cards).toHaveLength(60);
    });

    it('exposes only the agreed card fields', async () => {
      const response = await request(app.getHttpServer())
        .get(`/editions/${FREE_SLUG}/deck`)
        .expect(200);

      const { cards } = DeckResponseSchema.parse(response.body);
      const rawCards = (response.body as { cards: object[] }).cards;

      expect(rawCards).toEqual(cards);
    });

    it('answers 403 for a paid edition and leaks none of its cards', async () => {
      const response = await request(app.getHttpServer())
        .get('/editions/paid-edition/deck')
        .expect(403);

      expect(response.text).not.toContain(PAID_CARD_TEMPLATE);
      expect(response.text).not.toContain(PAID_CARD_ID);
      expect(response.body).not.toHaveProperty('cards');
    });

    it('answers 404 for an unknown edition', async () => {
      await request(app.getHttpServer()).get('/editions/nope/deck').expect(404);
    });

    it.each([
      ['a NUL byte', '%00'],
      ['upper case letters', 'Klasyczna'],
      ['a space', 'two%20words'],
      ['an encoded slash', 'a%2Fb'],
      ['an encoded dot segment', '%2E%2E'],
    ])('answers 404, not 500, for a slug with %s', async (_, slug) => {
      await request(app.getHttpServer()).get(`/editions/${slug}/deck`).expect(404);
    });

    it('answers 404 for an unpublished edition', async () => {
      const response = await request(app.getHttpServer())
        .get('/editions/draft-edition/deck')
        .expect(404);

      expect(response.text).not.toContain(DRAFT_CARD_TEMPLATE);
    });
  });
});
