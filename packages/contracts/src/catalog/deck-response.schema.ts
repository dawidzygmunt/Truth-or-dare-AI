import { z } from 'zod';

export const CardKindSchema = z.enum(['truth', 'dare', 'statement', 'challenge']);

export const DeckCardSchema = z.object({
  id: z.string().min(1),
  kind: CardKindSchema,
  template: z.string().min(1),
  penaltyShots: z.number().int().positive().nullable(),
});

export const DeckResponseSchema = z.object({
  editionSlug: z.string().min(1),
  cards: z.array(DeckCardSchema),
});

export type CardKind = z.infer<typeof CardKindSchema>;
export type DeckCard = z.infer<typeof DeckCardSchema>;
export type DeckResponse = z.infer<typeof DeckResponseSchema>;
