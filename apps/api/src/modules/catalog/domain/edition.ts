export type EditionTier = 'free' | 'paid';
export type Platform = 'web' | 'android';

export interface Edition {
  id: string;
  slug: string;
  name: string;
  tier: EditionTier;
  productId: string | null;
  intensity: number;
  ageRating: number;
  platforms: Platform[];
  locale: string;
  isPublished: boolean;
}

/** Until entitlements exist (phase 2), every paid edition is locked for everyone. */
export function isEditionLocked(edition: Pick<Edition, 'tier'>): boolean {
  return edition.tier === 'paid';
}
