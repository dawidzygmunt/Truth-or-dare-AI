import {
  CardKindSchema,
  EditionTierSchema,
  GameEngineSchema,
  PlatformSchema,
  SlugSchema,
} from '@tod/contracts';
import { z } from 'zod';

const PLACEHOLDERS = new Set(['player', 'randomPlayer', 'playerLeft', 'playerRight']);

const BRACED = /\{[^{}]*\}/g;

function usesOnlyKnownPlaceholders(template: string): boolean {
  return [...template.matchAll(BRACED)].every(([braced]) => PLACEHOLDERS.has(braced.slice(1, -1)));
}

/** A brace outside a complete `{name}` pair would reach players as literal text. */
function hasNoStrayBraces(template: string): boolean {
  return !/[{}]/.test(template.replace(BRACED, ''));
}

export const SeedCardSchema = z.strictObject({
  id: z.string().min(1),
  kind: CardKindSchema,
  template: z
    .string()
    .min(1)
    .refine(usesOnlyKnownPlaceholders, 'unknown placeholder')
    .refine(hasNoStrayBraces, 'stray brace'),
  tags: z.array(z.string().min(1)),
  intensity: z.number().int().min(1).max(5),
  penaltyShots: z.number().int().positive().nullable().default(null),
});

export const SeedEditionSchema = z
  .strictObject({
    slug: SlugSchema,
    name: z.string().min(1),
    tier: EditionTierSchema,
    productId: z.string().min(1).nullable().default(null),
    intensity: z.number().int().min(1).max(5),
    ageRating: z.number().int().positive(),
    platforms: z.array(PlatformSchema).min(1),
    locale: z.string().min(1),
    isPublished: z.boolean(),
    cards: z.array(SeedCardSchema),
  })
  .superRefine((edition, ctx) => {
    // Seeding makes the data the truth, so an empty published edition would wipe its deck.
    if (edition.isPublished && edition.cards.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['cards'],
        message: 'a published edition needs at least one card',
      });
    }
    if (edition.tier === 'paid' && edition.productId === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['productId'],
        message: 'a paid edition needs a productId',
      });
    }
  });

export const SeedGameSchema = z
  .strictObject({
    slug: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    engine: GameEngineSchema,
    editions: z.array(SeedEditionSchema),
  })
  .superRefine((game, ctx) => {
    // Card id is the primary key across all editions, so a reused id would silently move a card.
    const seen = new Set<string>();
    game.editions.forEach((edition, editionIndex) => {
      edition.cards.forEach((card, cardIndex) => {
        if (seen.has(card.id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['editions', editionIndex, 'cards', cardIndex, 'id'],
            message: `duplicate card id "${card.id}"`,
          });
        }
        seen.add(card.id);
      });
    });
  });

export type SeedCard = z.infer<typeof SeedCardSchema>;
export type SeedEdition = z.infer<typeof SeedEditionSchema>;
export type SeedGame = z.infer<typeof SeedGameSchema>;
