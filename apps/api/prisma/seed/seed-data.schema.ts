import {
  CardKindSchema,
  EditionTierSchema,
  GameEngineSchema,
  PlatformSchema,
} from '@tod/contracts';
import { z } from 'zod';

const PLACEHOLDERS = new Set(['player', 'randomPlayer', 'playerLeft', 'playerRight']);

function usesOnlyKnownPlaceholders(template: string): boolean {
  return [...template.matchAll(/\{(.*?)\}/g)].every(([, name]) => PLACEHOLDERS.has(name ?? ''));
}

export const SeedCardSchema = z.object({
  id: z.string().min(1),
  kind: CardKindSchema,
  template: z.string().min(1).refine(usesOnlyKnownPlaceholders, 'unknown placeholder'),
  tags: z.array(z.string().min(1)),
  intensity: z.number().int().min(1).max(5),
  penaltyShots: z.number().int().positive().nullable().default(null),
});

export const SeedEditionSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  tier: EditionTierSchema,
  productId: z.string().min(1).nullable().default(null),
  intensity: z.number().int().min(1).max(5),
  ageRating: z.number().int().positive(),
  platforms: z.array(PlatformSchema).min(1),
  locale: z.string().min(1),
  isPublished: z.boolean(),
  cards: z.array(SeedCardSchema),
});

export const SeedGameSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  engine: GameEngineSchema,
  editions: z.array(SeedEditionSchema),
});

export type SeedCard = z.infer<typeof SeedCardSchema>;
export type SeedGame = z.infer<typeof SeedGameSchema>;
