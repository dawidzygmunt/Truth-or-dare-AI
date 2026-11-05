import { z } from 'zod';

export const GameEngineSchema = z.enum(['card_deck']);
export const EditionTierSchema = z.enum(['free', 'paid']);
export const PlatformSchema = z.enum(['web', 'android']);

export const CatalogEditionSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  tier: EditionTierSchema,
  locked: z.boolean(),
  intensity: z.number().int().min(1).max(5),
  ageRating: z.number().int().positive(),
  platforms: z.array(PlatformSchema),
  locale: z.string().min(1),
});

export const CatalogGameSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  engine: GameEngineSchema,
  editions: z.array(CatalogEditionSchema),
});

export const CatalogResponseSchema = z.object({ games: z.array(CatalogGameSchema) });

export type GameEngine = z.infer<typeof GameEngineSchema>;
export type EditionTier = z.infer<typeof EditionTierSchema>;
export type Platform = z.infer<typeof PlatformSchema>;
export type CatalogEdition = z.infer<typeof CatalogEditionSchema>;
export type CatalogGame = z.infer<typeof CatalogGameSchema>;
export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;
